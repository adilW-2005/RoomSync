const { Router } = require('express');
const { authRequired } = require('../middlewares/auth');

const router = Router();

router.get('/me', authRequired, async (req, res) => {
  const user = req.user.toJSON();
  return res.success(user);
});

module.exports = router; 