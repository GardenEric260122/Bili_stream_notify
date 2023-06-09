// 监控 bilibili 直播间，显示系统通知进行提醒
// 默认只在开播时发送通知
const https = require('https')
const notifier = require('node-notifier')
const child_process = require('child_process')
const fs = require('fs')
const path = require('path')

// 以直播间为单位进行配置
// 可以只填写 room_id；如果有需要，也可以修改 name 和 notify_title
// 其他选项不要修改，会自动获取

// notify_title 里可以使用的转义代码：
// {name} {title} {room_id}
const room_list = [
  {
    room_id: 24613387,
    name: '',
    status: 0,
    cover: '',
    avatar: '',
    title: '',
    notify_title: [
      '{name}尚未开播',
      '{name}正在直播',
      '{name}正在轮播',
    ],
  },
]

// 获取直播间数据
function getLiveRoomData (room_id) {
  // 这个 api 获取的数据很少
  // const url = `https://api.live.bilibili.com/room/v1/Room/room_init?id=${room_id}`

  // 这个 api 获取的数据多，现在需要使用这个 api
  const url = `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${room_id}`
  https.get(url, res => {
    let body = ''

    res.on('data', (chunk) => {
      body += chunk
    })

    res.on('end', () => {
      try {
        const json = JSON.parse(body)
        parseRoomData(room_id, json)
      } catch (error) {
        console.error(error.message)
      }
    })
  }).on('error', (e) => {
    console.log(room_id)
    console.error(e)
  })
}

function getRoomCfg (room_id) {
  const room = room_list.find(data => data.room_id === room_id)
  if (!room) {
    console.log(`没找到这个直播间的配置${room_id}`)
  }
  return room
}

function parseRoomData (room_id, json) {
  const room = getRoomCfg(room_id)
  if (!room) {
    return
  }

  const status = json.data.room_info.live_status
  room.cover = json.data.room_info.cover
  room.avatar = json.data.anchor_info.base_info.face
  room.title = json.data.room_info.title
  if (!room.name) {
    room.name = json.data.anchor_info.base_info.uname
  }

  // 当直播状态变化时显示通知
  if (status !== room.status) {
    room.status = status
    switch (status) {
      case 0:
        // showNotify(room_id)
        break
      case 1:
        showNotify(room_id)
        break
      case 2:
        // showNotify(room_id)
        break
      default:
        console.log(`不知道啥情况。status ${status}`)
    }
  }
}

async function showNotify (room_id) {
  const room = getRoomCfg(room_id)
  if (!room) {
    return
  }
  let msg = room.notify_title[room.status]
  if (!msg) {
    return console.log(`没有找到通知消息文本。${room_id} ${room.status}`)
  }

  // 替换转义代码
  const title = msg.replace('{name}', room.name)
    .replace('{title}', room.title)
    .replace('{room_id}', room.room_id)

  const fileName = path.resolve(__dirname + `/avatar_${room.room_id}.jpg`)
  await saveFile(room.avatar, fileName)

  notifier.notify({
    title: title,
    message: room.title,
    icon: fileName,
    sound: true,
    wait: true
  },
    function (err, response) {
      // response 在 Windows 上的值有 3 种：
      // 点击通知：activate
      // 点击 x 关闭：dismissed
      // 等待超时：timeout
      if (response === 'activate') {
        const URL = `https://live.bilibili.com/${room_id}`
        openURL(URL)
      }
    }
  )
}

async function saveFile (url, fileName) {
  return new Promise(resolve => {
    https.get(url, (res) => {
      const file = fs.createWriteStream(fileName)
      res.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on("error", (err) => {
      console.log("Error: ", err.message)
    })
  })
}

function openURL (url) {
  // 判断平台
  switch (process.platform) {
    // Mac 使用open
    case "darwin":
      child_process.spawn('open', [url])
      break
    // Windows使用 start 报错了，我改为使用 exec
    case "win32":
      // child_process.spawn('start', [url])
      child_process.exec(`start ${url}`)
      break
    // Linux等使用xdg-open
    default:
      child_process.spawn('xdg-open', [url])
  }
}

// 启动
let time_start = 0
let add = 500 // 毫秒，如果有多个直播间，则每次请求错开一段时间，避免拥挤
const interval = 60000  // 毫秒，每个直播间隔多长时间查询一次

room_list.forEach(room_data => {
  setTimeout(() => {
    time_start += add

    // 启动时立即查询一次
    getLiveRoomData(room_data.room_id)

    // 然后定时查询
    setInterval(() => {
      getLiveRoomData(room_data.room_id)
    }, interval)
  }, time_start)
})
