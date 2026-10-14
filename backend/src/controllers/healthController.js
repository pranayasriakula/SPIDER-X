const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy'
  });
};

module.exports = { getHealth };
