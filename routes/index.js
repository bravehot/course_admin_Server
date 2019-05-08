var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const md5 = require('blueimp-md5')
const { UserModel, TeacherModel } = require('../db/model')
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
function checkToken (req) {
  // 这是解密的 key（密钥），和生成 token 时的必须一样
  let secret = 'dktoken';
  let {authorization} = req.headers  
  let result = jwt.verify(authorization, secret, (error, result) => {
    if (result) {
      return true
    } else {
      return false
    }
  })
  return result
}
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
// login and register
router.post('/login', (req, res) => {
  let { type, username, password } = req.body
  switch (type) {
    case 1: // login
      UserModel.findOne({ username }, (err, userDoc) => {
        if (userDoc) { // find user
          if (userDoc.password === password) { // exists user then contrast password
            let token = setToken(username)
            res.send({ code: 200, data: { username, token }, msg: '登录成功' })
          } else {
            res.send({ code: 500, msg: '错误' })
          }
        } else {
          res.send({ code: 500, msg: '错误' })
        }
      })
      break;
    case 2: // register
      UserModel.findOne({ username }, (err, userDoc) => {
        if (userDoc) {
          res.send({ code: 500, msg: '用户已存在' })
        } else {
          let token = setToken(username)
          new UserModel({ username, password, token }).save((err, userDoc) => {
            console.log(userDoc)
            res.send({ code: 200, data: { username, token }, msg: '用户注册成功' })
          })
        }
      })
      break;
    default:
      break;
  }
})

// setUserInfo 
router.post('/setInfo', (req, res) => {
  let {username, oldPwd, newPwd} = req.body

})

// modification pwd
router.post('/mudificationPwd', (req, res) => {
  let {username, password} = req.body
  UserModel.findOne({ username }, (err, userDoc) => {
    if (userDoc.password === password) {
      res.send({code: 200, msg: 'success'})
    } else {
      res.send({code: 500, msg: 'error'})
    }
  })
})

// setTeacherClassInfo
router.post('/setTeacherClass', (req, res) => {
  let {username} = req.body
  let {token} = req.cookies
  UserModel.findOne({username}, (err, userDoc) => {
    if (userDoc.token == token) {
      let {username, weeks, week, classRoom, start, end, name} = req.body
      weeks = weeks.sort((a, b) => {return a - b})
      let hasEvenWeek = [] // 数据库中已经存在的week
      let noEvenWeek = [] // 数据库中没有存在的week
      weeks.forEach((item, index) => {
        TeacherModel.findOne({weeksName: item}, (err, TeacherDoc) => {
          if (TeacherDoc && TeacherDoc.weeksName == item) { // 是否设置的周已经存在
            hasEvenWeek.push(TeacherDoc.weeksName)
          } else {
            new TeacherModel({
              username,
              weeksName: item,
              week,
              classRoom,
              name
            }).save((err, TeacherDoc) => {
              noEvenWeek.push(TeacherDoc.weeksName)
            })
          }
        })
      })
      res.send({ code: 200, noEvenWeek, hasEvenWeek, msg: 'success' })
      console.log(noEvenWeek, hasEvenWeek)
    } else {
      res.send({code: 500, msg: 'error'})
    }
  })
})
// 设置开学时间
router.post('/setStartTime', (req, res) =>{
  if (checkToken(req)) {
    let {startTime} = req.body
    let {authorization} = req.headers
    let token = authorization
    UserModel.findOne({token}, (err, userDoc) => {
      if (userDoc.token === token){
        UserModel.findOneAndUpdate({token}, {startTime}, (err, userDoc) => {
          res.send({code: 200, data: userDoc.startTime, msg: 'success'})
        })
      } else {
        res.send({code: 500, msg: 'token错误'})
      }
    })
  } else {
    res.send({code:500, msg: 'token失效'})
  }
})

// 获取用户的基本信息
router.get('/getUserInfo', (req, res) => {
  if (checkToken(req)) {
    let {authorization} = req.headers
    let token = authorization
    UserModel.findOne({token}, (err, userDoc) => {
      let {username, startTime, classTimes, classNames} = userDoc
      res.send({code: 200, data: {username, startTime, classTimes, classNames}, msg: 'success'})
    })

  } else {
    res.send({code: 500, msg: 'token失效'})
  }
})
module.exports = router;
