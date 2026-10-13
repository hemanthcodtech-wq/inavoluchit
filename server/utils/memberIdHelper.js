const { User } = require('../models');

const generateNextMemberId = async () => {
  try {
    const usersWithMemberId = await User.find({
      memberId: { $exists: true, $ne: null }
    }).select('memberId').lean();

    let maxNum = 100;
    usersWithMemberId.forEach((u) => {
      if (u.memberId) {
        const match = u.memberId.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    // Default starting format: INA101, INA102, INA103...
    const nextNum = maxNum + 1;
    return `INA${nextNum}`;
  } catch (err) {
    console.error('Error generating member ID:', err);
    return `INA${Math.floor(100 + Math.random() * 900)}`;
  }
};

const backfillMissingMemberIds = async () => {
  try {
    // 1. Migrate any legacy ANR prefixes to INA
    const legacyAnrUsers = await User.find({ memberId: /^ANR/i }).lean();
    for (const u of legacyAnrUsers) {
      if (u.memberId) {
        const migratedId = u.memberId.replace(/^ANR/i, 'INA');
        await User.findByIdAndUpdate(u._id, { memberId: migratedId });
        console.log(`Migrated user ${u.name} from ${u.memberId} to ${migratedId}`);
      }
    }

    // 2. Assign IDs to any users missing one
    const usersMissingId = await User.find({
      $or: [
        { memberId: null },
        { memberId: '' },
        { memberId: { $exists: false } }
      ]
    }).sort({ createdAt: 1 }).lean();

    if (usersMissingId.length === 0) return;

    let currentNum = 100;

    // Check highest existing number
    const existingWithId = await User.find({
      memberId: { $exists: true, $ne: null }
    }).select('memberId').lean();

    existingWithId.forEach((u) => {
      if (u.memberId) {
        const match = u.memberId.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > currentNum) {
            currentNum = num;
          }
        }
      }
    });

    for (const u of usersMissingId) {
      currentNum += 1;
      const newMemberId = `INA${currentNum}`;
      await User.findByIdAndUpdate(u._id, { memberId: newMemberId });
      console.log(`Assigned memberId ${newMemberId} to user ${u.name} (${u.email})`);
    }
  } catch (err) {
    console.error('Error backfilling missing member IDs:', err);
  }
};

module.exports = {
  generateNextMemberId,
  backfillMissingMemberIds
};
