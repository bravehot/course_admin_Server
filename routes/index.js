var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const md5 = require('blueimp-md5')
const { UserModel, TeacherModel } = require('../db/model')
const { handleData } = require('../utils/handleData')
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
function checkToken(req) {
  // 这是解密的 key（密钥），和生成 token 时的必须一样
  let secret = 'dktoken';
  let { authorization } = req.headers
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
            UserModel.findOneAndUpdate({ username }, { token }, (err, userDoc) => { // 更新token并返回一个新的token
              res.send({ code: 200, data: { username, token }, msg: '登录成功' })
            })
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
  let { username, oldPwd, newPwd } = req.body

})

// modification pwd
router.post('/mudificationPwd', (req, res) => {
  let { username, password } = req.body
  UserModel.findOne({ username }, (err, userDoc) => {
    if (userDoc.password === password) {
      res.send({ code: 200, msg: 'success' })
    } else {
      res.send({ code: 500, msg: 'error' })
    }
  })
})

// setTeacherClassInfo
router.post('/setTeacherClass', (req, res) => {
  if (checkToken(req)) {
    let { name } = req.body
    TeacherModel.findOne({ name }, (err, teacherDoc) => {
      if (teacherDoc) { // 查到相同的课程名称
        res.send({ code: 400, msg: '已添加此课程的信息' })
      } else {
        let { username, weeks, week, classRoom, name } = req.body
        weeks = weeks.sort((a, b) => { return a - b })
        weeks.forEach((item, index) => {
          new TeacherModel({
            username,
            weeksName: item,
            week,
            classRoom,
            name
          }).save()
        })
        res.send({code: 200, msg: 'success'})
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})
// 设置开学时间
router.post('/setStartTime', (req, res) => {
  if (checkToken(req)) {
    let { startTime } = req.body
    let { authorization } = req.headers
    let token = authorization
    UserModel.findOne({ token }, (err, userDoc) => {
      if (userDoc.token === token) {
        UserModel.findOneAndUpdate({ token }, { startTime }, (err, userDoc) => {
          res.send({ code: 200, data: userDoc.startTime, msg: 'success' })
        })
      } else {
        res.send({ code: 500, msg: 'token错误' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 获取用户的基本信息
router.get('/getUserInfo', (req, res) => {
  if (checkToken(req)) {
    let { authorization } = req.headers
    let token = authorization
    UserModel.findOne({ token }, (err, userDoc) => {
      let { username, startTime, classTimes, classNames } = userDoc
      res.send({ code: 200, data: { username, startTime, classTimes, classNames }, msg: 'success' })
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 获取当前周的上课信息
router.get('/getThisWeekInfo', (req, res) => {
  let weeksName = req.query
  if (checkToken(req)) {
    TeacherModel.find(weeksName, { _id: 0 }, (err, teacherDoc) => {
      if (teacherDoc) {
        let thisWeekInfo = teacherDoc // 当前周的所有课程信息
        let MondayInfo = [] // 周一
        let TuesdayInfo = []
        let WednesdayInfo = []
        let ThursdayInfo = []
        let FridayInfo = []
        let SaturdayInfo = []
        let SundayInfo = []
        thisWeekInfo.forEach((itemWeekInfo, itemWeekInfoIndex) => { // 大数组 两门课程
          itemWeekInfo.week.forEach((itemWeek, itemWeekIndex) => { // 周一到周天的上课信息 7
            Object.values(itemWeek).forEach((item, index) => { // 每天每节课的上课信息
              if (item.length) {
                obj = {
                  classNames: [] , // 上课的班级
                  roomName: [], // 教室
                  name: [] // 要上的课程
                }
                obj.classNames.push(item.join())
                obj.roomName.push(itemWeekInfo.classRoom)
                obj.name.push(itemWeekInfo.name)
              } else {
                obj = {}
              }
              switch (itemWeekIndex) { // 周一到周天
                case 0:
                  MondayInfo.push(obj)
                  break;
                case 1:
                  TuesdayInfo.push(obj)
                  break;
                case 2:
                  WednesdayInfo.push(obj)
                  break;
                case 3:
                  ThursdayInfo.push(obj)
                  break;
                case 4:
                  FridayInfo.push(obj)
                  break;
                case 5:
                  SaturdayInfo.push(obj)
                  break;
                case 6:
                  SundayInfo.push(obj)
                  break;
                default:
                  break;
              }
            })
          })
        })
        let result = {
          MondayInfo: handleData(MondayInfo, 6),
          TuesdayInfo: handleData(TuesdayInfo, 6),
          WednesdayInfo: handleData(WednesdayInfo, 6),
          ThursdayInfo: handleData(ThursdayInfo, 6),
          FridayInfo: handleData(FridayInfo, 6),
          SaturdayInfo: handleData(SaturdayInfo, 6),
          SundayInfo: handleData(SundayInfo, 6)
        }
        res.send({code: 200, data: result, msg: 'success'})
      } else {
        res.send({code: 400, msg: '暂无本周的上课信息'})
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})
module.exports = router;
