const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const buyerId = req.session?.buyerId || req.session?.userId || req.user?.id;
    if (!buyerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await User.getById(buyerId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Buyer not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        city: user.city,
        role: user.role_name,
      }
    });
  } catch (err) {
    console.error('[BuyerController.getProfile] Error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const buyerId = req.session?.buyerId || req.session?.userId || req.user?.id;
    if (!buyerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const updated = await User.update(buyerId, req.body || {});
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Buyer not found' });
    }

    return res.json({
      success: true,
      message: 'Profile updated',
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        first_name: updated.first_name,
        last_name: updated.last_name,
        phone_number: updated.phone_number,
        city: updated.city,
        role: updated.role_name,
      }
    });
  } catch (err) {
    console.error('[BuyerController.updateProfile] Error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

