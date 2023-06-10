const https = require('https')
const notifier = require('node-notifier')
const child_process = require('child_process')
const fs = require('fs')
const path = require('path')

// 监控 bilibili 直播间，显示系统通知进行提醒
// 默认只在开播时发送通知

// 在下面的数组 [ ] 里配置要监控的直播间，每个花括号对 { }, 代表一个直播间
// 预设了 2 个直播间位置，你可以根据自己的需要进行增删
// 每个直播间只需要填写房间号 room_id
// name 可以留空，不写的话会使用主播的名字；也可以填写名字或昵称以便区分
const config = [
  {
    room_id: 111111111,
    name: '',
  },
  {
    room_id: 222222222,
    name: '名字或昵称',
  },
]

// -------------以下部分无需修改-------------

// 获取直播间数据
function getLiveRoomData (room_id) {
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
        console.error(body)
        console.error(error.message)
      }
    })
  }).on('error', (e) => {
    console.log(room_id)
    console.error(e)
  })
}

function parseRoomData (room_id, json) {
  // 如果房间号不存在那么 data 就是 null
  if (json.data === null || json.data === undefined) {
    return
  }

  const room = room_list.find(data => data.room_id === room_id)
  room.cover = json.data.room_info.cover
  room.avatar = json.data.anchor_info.base_info.face
  room.title = json.data.room_info.title
  if (!room.name) {
    room.name = json.data.anchor_info.base_info.uname
  }

  // 当直播状态变化时显示通知
  const status = json.data.room_info.live_status
  if (status !== room.status) {
    room.status = status
    switch (status) {
      case 0:
        // showNotify(room, '{name}尚未开播')
        break
      case 1:
        showNotify(room, '{name}正在直播')
        break
      case 2:
        // showNotify(room, '{name}正在轮播')
        break
      default:
        console.log(`不知道啥情况。status ${status}`)
    }
  }
}

async function showNotify (room, title) {
  // 替换 title 里的转义代码
  // {name} {title} {room_id}
  title = title.replace('{name}', room.name)
    .replace('{title}', room.title)
    .replace('{room_id}', room.room_id)

  const date = new Date().toLocaleString()
  console.log(`${title} ${room.title} ${date}`)

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
    if (url.startsWith('http:')) {
      url = url.replace('http:', 'https:')
    }
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
const room_list = config.map(cfg => {
  return {
    room_id: cfg.room_id,
    name: cfg.name,
    status: 0,
    cover: '',
    avatar: '',
    title: '',
  }
})

let time_start = 0
const add = 500 // 毫秒，如果有多个直播间，则每次请求错开一段时间，避免拥挤
const interval = 60000  // 毫秒，每个直播间隔多长时间查询一次

console.log('监控列表：')
room_list.forEach(room => {
  const tab = String(room.room_id).length < 8 ? '\t\t' : '\t'
  console.log(`${room.room_id}${tab}${room.name}`)
  setTimeout(() => {
    time_start += add

    // 启动时立即查询一次
    getLiveRoomData(room.room_id)

    // 然后定时查询
    setInterval(() => {
      getLiveRoomData(room.room_id)
    }, interval)
  }, time_start)
})