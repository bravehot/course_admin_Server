function handleData (data, num) {
  let result = [];
  for(let i = 0; i < data.length ; i += num){
     result.push(data.slice(i, i + num));
  }
  return result
}
module.exports = {
  handleData
}