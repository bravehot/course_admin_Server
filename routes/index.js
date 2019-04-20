var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const md5 = require('blueimp-md5')
const { UserModel } = require('../db/model')
// 设置token
const setToken = (type) => {
  // 加密的 key（密钥）
  let secret = 'dktoken';
  //生成 Token
  let token = jwt.sign({ type }, secret, {
    'expiresIn': 60 * 60 * 24 // 设置过期时间, 24 小时
  })
  return token
}
// 校验token
const checkToken = (req) => {
  // 这是解密的 key（密钥），和生成 token 时的必须一样
  let secret = 'dktoken';
  let token = req.headers['auth'];
  jwt.verify(token, secret, (error, result) => {
    if (error) {
      return false
    } else {
      return true
    }
  })
}
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
// 登录 && 注册
router.post('/login', (req, res) => {
  let { type, username, password } = req.body
  switch (type) {
    case 1: // 登录
      UserModel.findOne({ username }, (err, userDoc) => {
        if (userDoc.password === password) {
          let token = setToken(username)
          res.send({ code: 200, data: { username, token }, msg: '登录成功' })
        } else {
          res.send({ code: 500, msg: '错误' })
        }
      })
      break;
    case 2: // 注册
      UserModel.findOne({ username }, (err, userDoc) => {
        if (userDoc) {
          res.send({ code: 500, msg: '用户已存在' })
        } else {
          new UserModel({ username, password }).save((err, userDoc) => {
            let token = setToken(username)
            res.send({ code: 200, data: { username, token }, msg: '用户注册成功' })
          })
        }
      })
      break;
    default:
      break;
  }
})

module.exports = router;
