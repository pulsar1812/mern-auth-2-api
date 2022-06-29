const express = require('express');
// Controllers
const { requireSignin, adminMiddleware } = require('../middlewares/auth');
const { getUser, updateUser } = require('../controllers/user');

const router = express.Router();

router.get('/user/:id', requireSignin, getUser);
router.put('/user/update', requireSignin, updateUser);
router.put('/admin/update', requireSignin, adminMiddleware, updateUser);

module.exports = router;
