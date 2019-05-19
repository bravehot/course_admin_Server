const md5 = require('blueimp-md5')
// 连接数据库
const mongoose = require('mongoose')
// 连接指定数据库
mongoose.connect('mongodb://localhost:27017/todoList_admin', {useNewUrlParser: true})
// 获取连接对象
const conn = mongoose.connection
conn.on('connected', () => {
  console.log('数据库连接完成')
})
const userSchema = mongoose.Schema({
  username: {type: String, require: true},
  password: {type: String, require: true},
  post: {type: String, default: '', trim: true}, // 职位
  startTime: {type: String, default: '', trim: true}, // 开学时间
  classTimes: {type: Array}, // 上课时间断
  classNames: {type: Array}, // 上课班级
  token: {type: String}, // token
})
const UserModel = mongoose.model('user', userSchema) 

const teacherClassInfoSchema = mongoose.Schema({
  name: {type: String, require: true},
  classRoom: {type: String, require: true},
  username: {type: String, require: true},
  week: {type: Array, require: true},
  weeksName: {type: String, require: true}
})
const TeacherModel = mongoose.model('TeaClassInfo', teacherClassInfoSchema)

const memoSchema = mongoose.Schema({
  username: {type: String, require: true},
  name: {type: String, require: true},
  time: {type: String, require: true},
  content: {type: String, require: true},
  selectType: {type: Array, require: true},
  isRemind: {type: Boolean, require: true},
  date: {type: String, require: true},
  isFinish: {type: Boolean, require: true},
})
const MemoModel = mongoose.model('memoList', memoSchema)

exports.UserModel = UserModel // 用户信息
exports.TeacherModel = TeacherModel // 用户上课信息
exports.MemoModel = MemoModel // 用户待办事项
