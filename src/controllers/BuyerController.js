const Buyer = require('../models/Buyer');

exports.getProfile = async (req, res) => {
  try {
    const buyerId = req.session.buyerId || req.user?.id;
    const buyer = await Buyer.findById(buyerId);
    if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
    res.json({ name: buyer.name, email: buyer.email, address: buyer.address });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const buyerId = req.session.buyerId || req.user?.id;
    const { name, email, address } = req.body;
    const buyer = await Buyer.findByIdAndUpdate(
      buyerId,
      { name, email, address },
      { new: true }
    );
    if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
    res.json({ message: 'Profile updated', name: buyer.name, email: buyer.email, address: buyer.address });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
