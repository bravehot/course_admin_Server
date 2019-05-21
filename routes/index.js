var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const md5 = require('blueimp-md5')
var schedule = require('node-schedule');
var request = require('request')
const { UserModel, TeacherModel, MemoModel } = require('../db/model')
const { handleData } = require('../utils/handleData')
let hasEvenConnect = []
// socket 连接
const socketConnect = (username, socketData) => {
  let result = hasEvenConnect.length ? hasEvenConnect.some((item) => {
    return item !== username
  }) : true
  if (result) {
    if (socketData.length) {
      let socketList = socketData.filter(item => {
        return item.name
      })
      classNums = socketList.length
    }
    /* 
      测试时间 30 * * * * *  每分钟的第30秒提醒
      正常时间 30 7 1 * * *  每天7点30分提醒
    */
    schedule.scheduleJob('30 * * * * *', function () {
      request.post({
        url: 'http://rest-hangzhou.goeasy.io/publish',
        form: {
          appkey: 'BC-e95e600df2ac4c769a3d8105904508bc',
          channel: 'sendClassInfo',
          content: classNums
        }
      }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          console.log("连接成功")
          return
        } else {
          console.log(error)
          console.log('连接失败')
        }
      })
    });
  }
  hasEvenConnect.push(username)
}

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
        res.send({ code: 200, msg: 'success' })
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
      if (userDoc) {
        let { username, startTime, classTimes, classNames } = userDoc
        res.send({ code: 200, data: { username, startTime, classTimes, classNames }, msg: 'success' })
      } else {
        res.send({ code: 500, msg: '没有此用户的任何信息' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 获取当前周的上课信息
router.get('/getThisWeekInfo', (req, res) => {
  let { weeksName, username } = req.query
  if (checkToken(req)) {
    TeacherModel.find({ username }, { _id: 0 }, (err, teacherDoc) => {
      if (teacherDoc) {
        let data = teacherDoc.filter((item, index) => {
          return item.weeksName === weeksName
        })
        if (data.length) {
          let thisWeekInfo = data // 当前周的所有课程信息
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
                    classNames: [], // 上课的班级
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
          let week = new Date().getDay()
          let socketData = []
          switch (week) {
            case 1:
              socketData = MondayInfo
              break;
            case 2:
              socketData = TuesdayInfo
              break;
            case 3:
              socketData = WednesdayInfo
              break;
            case 4:
              socketData = ThursdayInfo
              break;
            case 5:
              socketData = FridayInfo
              break;
            case 6:
              socketData = SaturdayInfo
              break;
            case 7:
              socketData = SundayInfo
              break;
            default:
              break;
          }
          let result = {
            MondayInfo: handleData(MondayInfo, 5),
            TuesdayInfo: handleData(TuesdayInfo, 5),
            WednesdayInfo: handleData(WednesdayInfo, 5),
            ThursdayInfo: handleData(ThursdayInfo, 5),
            FridayInfo: handleData(FridayInfo, 5),
            SaturdayInfo: handleData(SaturdayInfo, 5),
            SundayInfo: handleData(SundayInfo, 5)
          }
          res.send({ code: 200, data: result, msg: 'success' })
          socketConnect(username, socketData)
        } else {
          res.send({ code: 400, data: [], msg: '暂无本周的上课信息' })
          scheduleCronstyle([])
        }
      } else {
        res.send({ code: 400, msg: '暂无本周的上课信息' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 获取本课程的所有信息
router.get('/getThisClassInfo', (req, res) => {
  let { username, className } = req.query
  if (checkToken(req)) {
    TeacherModel.find({ username }, (err, teacherDoc) => {
      if (teacherDoc.length) {
        let data = teacherDoc.filter(item => {
          return item.name === className
        })
        if (data[0]) {
          res.send({ code: 200, data: data[0], msg: 'success' })
        } else {
          res.send({ code: 400, msg: '没有当节课的信息' })
        }
      } else {
        res.send({ code: 400, msg: '没有当节课的信息' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 更新课程信息
router.post('/updateClassInfo', (req, res) => {
  if (checkToken(req)) {
    let { username, name, classRoom, weeks, week, _id } = req.body
    TeacherModel.find({ username }, (err, teacherDoc) => {
      if (teacherDoc) {
        let result = teacherDoc.filter((item, index) => {
          return item._id == _id
        })
        if (result.length) {
          TeacherModel.update({ _id }, { name, classRoom, weeksName: weeks.join(), week }, (err, doc) => {
            if (doc) {
              res.send({ code: 200, data: {}, msg: 'success' })
            } else {
              res.send({ code: 400, data: {}, msg: '更新失败，请稍后再试' })
            }
          })
        } else {
          res.send({ code: 400, msg: '更新失败，请稍后再试' })
        }
      } else {
        res.send({ code: 400, msg: '找不到该用户' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 删除课程信息
router.get('/deleteClassInfo', (req, res) => {
  let { _id } = req.query
  if (checkToken(req)) {
    TeacherModel.findByIdAndRemove(_id, (err, doc) => {
      if (doc) {
        res.send({ code: 200, msg: 'success' })
      } else {
        res.send({ code: 400, msg: '删除失败，请稍后再试！！！' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 设置需要上课班级
router.post('/setNeedClass', (req, res) => {
  if (checkToken(req)) {
    let { username, classNames } = req.body
    UserModel.update({ username }, { classNames }, (err, doc) => {
      if (doc) {
        res.send({ code: 200, data: classNames, msg: 'success' })
      } else {
        res.send({ code: 400, msg: '暂无本用户的信息' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 添加待办事项
router.post('/addMemoInfo', (req, res) => {
  if (checkToken(req)) {
    let { username, name, time, content, selectType, isRemind, date, isFinish } = req.body
    new MemoModel({ username, name, time, content, selectType, isRemind, date, isFinish }).save((err, memoDoc) => {
      if (memoDoc) {
        MemoModel.find({ username }, (err, doc) => {
          let result = doc.filter(item => {
            return item.date === date
          })
          if (result.length) {
            res.send({ code: 200, data: result, msg: 'success' })
          } else {
            res.send({ code: 400, msg: '保存待办事项失败' })
          }
        })
      } else {
        res.send({ code: 400, msg: '保存待办事项失败' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 获取当天的待办事项
router.get('/getMemoInfo', (req, res) => {
  if (checkToken(req)) {
    let { username, date } = req.query
    MemoModel.find({ username }, (err, Memodoc) => {
      if (Memodoc) {
        let result = Memodoc.filter(item => {
          return item.date === date
        })
        if (result.length) {
          res.send({ code: 200, data: result, msg: 'success' })
        } else {
          res.send({ code: 400, msg: '没有当天的待办事项' })
        }
      } else {
        res.send({ code: 400, msg: '没有此用户的信息' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 更新待办事项
router.post('/updateMemoInfo', (req, res) => {
  if (checkToken(req)) {
    let { username, name, time, content, selectType, isRemind, date, isFinish, _id } = req.body
    MemoModel.findByIdAndUpdate({ _id }, { name, time, content, selectType, isRemind, date, isFinish }, (err, memoDoc) => {
      if (memoDoc) {
        res.send({ code: 200, data: [], msg: 'success' })
      } else {
        res.send({ code: 400, msg: '更新失败，请稍后再试！' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 删除当前的待办事项
router.get('/deleteThisMemo', (req, res) => {
  if (checkToken(req)) {
    let { id } = req.query
    MemoModel.findByIdAndRemove({ _id: id }, (err, memoDoc) => {
      if (memoDoc) {
        res.send({ code: 200, data: [], msg: 'success' })
      } else {
        res.send({ code: 400, msg: '删除失败，请稍后再试' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})

// 将当前事项设置为已完成
router.get('/setMemoFinish', (req, res) => {
  if (checkToken(req)) {
    let { id, isFinish } = req.query
    MemoModel.findByIdAndUpdate({ _id: id }, { isFinish }, (err, memoDoc) => {
      if (memoDoc) {
        res.send({ code: 200, data: [], msg: 'success' })
      } else {
        res.send({ code: 400, msg: '设置失败，请稍后再试' })
      }
    })
  } else {
    res.send({ code: 500, msg: 'token失效' })
  }
})
module.exports = router;
