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
  post: {type: String}, // 职位
  startTime: {type: String}, // 开学时间
  classTimes: {type: Array}, // 上课时间断
  classNames: {type: Array}, // 上课班级
})
const UserModel = mongoose.model('user', userSchema)
exports.UserModel = UserModel