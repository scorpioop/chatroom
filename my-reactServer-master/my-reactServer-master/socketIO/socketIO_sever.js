const { ChatModel } = require("../db/models");
const { UserModel } = require("../db/models");
module.exports = function (server) {
  //得到IO对象
  const io = require("socket.io")(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });
  //监视连接(当有一个客户连接上时回调)
  io.on("connection", function (socket) {
    console.log("soketio connected");
    //每次连接更新socketID
    socket.on("userId", function (userId) {
      UserModel.findByIdAndUpdate(
        userId,
        { socketId: socket.id,
          onLine: true
         },
        function (err, res) {
          if (err) {
            console.log("更新失败");
          } else {
            console.log("更新成功");
          }
        }
      );
    });

    //绑定sendMsg监听,接收客户端发送的消息
    socket.on("sendMsg", function ({ from, to, content }) {
      // console.log(io.sockets.sockets);

      console.log("接收到客户端的数据", { from, to, content });
      UserModel.findOne({ _id: to }, function (err, ret) {
        if (err) {
          console.log("查询失败");
        } else {
          // 拿到所有连接中的socketId
          let socketIds = [];
          io.sockets.sockets.forEach((value, key) => {
            socketIds.push(key);
          });
          const chat_id = [from, to].sort().join("_"); //from_to或者to_from
          const create_time = new Date();
          new ChatModel({ from, to, content, chat_id, create_time }).save(
            function (err, chatMsg) {
              //只向指定socketID发消息
              if (socketIds.indexOf(ret.socketId) !== -1) {
                io.to(ret.socketId).emit("receiveMsg", chatMsg);
              } else {
                console.log("用户未上线");
              }

              io.to(socket.id).emit("receiveMsg", chatMsg);
            }
          );
        }
      });
      // 处理数据（保存消息）
      // 准别chatMas对象的相关数据
    });
    //断联
    socket.on("disconnect", (reason) => {
      console.log("disconnect reason ", reason, socket.id);
      //userMap.delete(socket.handshake.query.username)
      UserModel.findOneAndUpdate(
        {socketId:socket.id},
        { 
          onLine: false
         },
        function (err, res) {
          if (err) {
            console.log(err);
          } else {
            console.log("更新成功");
          }
        }
      );
    });
  });
};
