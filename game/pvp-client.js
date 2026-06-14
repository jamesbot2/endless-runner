// ===== ENDLESS RUNNER - PVP Client (WebSocket bridge) =====
(function(){'use strict';var SG=window.__SG=window.__SG||{};
var ws=null,roomId=null,snapTimer=null,_active=false;

// ─── Bridges (called by network / called by game) ────

SG.setPvpRoomsFromServer=function(rooms){SG.pvpRooms=rooms||[];};
SG.setPvpRoomFromServer=function(room){SG.state.pvpRoom=room;};
SG.upsertPvpOpponentFromServer=function(data){
  if(!data||(!data.id&&!data.playerId))return;
  var pid=data.id||data.playerId;
  for(var i=0;i<(SG.state.pvpOpponents||[]).length;i++){
    var o=SG.state.pvpOpponents[i];
    if(o.id===pid||o.name===data.name){o.distance=data.distance||(data.snapshot?data.snapshot.distance:0);o.lane=data.lane!==undefined?data.lane:(data.snapshot?data.snapshot.lane:1);o.isJumping=data.isJumping||(data.snapshot?data.snapshot.isJumping:false);o.isRolling=data.isRolling||(data.snapshot?data.snapshot.isRolling:false);o.alive=data.alive!==undefined?data.alive:(data.snapshot?data.snapshot.alive!==false:true);return;}
}};
SG.getLocalPvpSnapshot=function(){if(!_active||!SG.state.started||SG.state.gameOver)return null;return{lane:SG.state.currentLane,distance:Math.floor(SG.state.score),isJumping:SG.state.isJumping,isRolling:SG.state.isRolling,alive:!SG.state.gameOver,spectating:false,characterId:'runner',timestamp:Date.now()};};

// ─── Connection ────────────────────────────────────

function getWsUrl(){var b=SG.apiBaseUrl;if(!b){var h=window.location.hostname||'35.212.200.85';return'ws://'+h+':3001/pvp';}var hp=b.replace(/^https?:\/\//,'').split(':')[0];return b.indexOf('https://')===0?'wss://'+hp+'/pvp':'ws://'+hp+':3001/pvp';}
function send(d){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(d));}
function startSnap(){stopSnap();_active=true;snapTimer=setInterval(function(){if(!roomId||!ws||ws.readyState!==WebSocket.OPEN){_active=false;return;}var s=SG.getLocalPvpSnapshot();if(s)send({type:'match:snapshot',roomId:roomId,snapshot:s});},50);}
function stopSnap(){_active=false;if(snapTimer){clearInterval(snapTimer);snapTimer=null;}}

SG.connectPvp=function(){if(ws&&ws.readyState===WebSocket.OPEN)return;if(!SG.account||!SG.account.token)return;
try{ws=new WebSocket(getWsUrl())}catch(e){setTimeout(SG.connectPvp,3000);return;}
ws.onopen=function(){send({type:'hello',token:SG.account.token});};
ws.onmessage=function(e){try{handle(JSON.parse(e.data))}catch(err){}};
ws.onclose=function(e){ws=null;stopSnap();_active=false;if(e.code!==4001&&e.code!==1000)setTimeout(SG.connectPvp,3000);};
};

SG.disconnectPvp=function(){_active=false;if(ws){ws.close(1000);ws=null;}stopSnap();roomId=null;SG.pvpRooms=[];SG.state.pvpRoom=null;};

function handle(msg){
switch(msg.type){
case'hello:ok':break;
case'error':console.log('[PVP]',msg.error);break;
case'room:list':SG.setPvpRoomsFromServer(msg.rooms);if(SG.renderPvpLobby)SG.renderPvpLobby();break;
case'room:update':SG.setPvpRoomFromServer(msg.room);if(SG.renderPvpLobby)SG.renderPvpLobby();if(msg.room&&SG.account){if(msg.room.players.some(function(p){return p.id===SG.account.email;}))roomId=msg.room.id;}break;
case'match:start':roomId=(msg.room&&msg.room.id)||msg.roomId;SG.state.pvpSeed=msg.seed||'';SG.state.pvpRoom=msg.room||msg;stopSnap();startSnap();
 // Let existing Phase 1 startPvpRace handle the game start
 if(typeof SG.startPvpRace==='function'){SG.startPvpRace();}break;
case'match:snapshot':
 if(msg.players&&Array.isArray(msg.players))for(var i=0;i<msg.players.length;i++)SG.upsertPvpOpponentFromServer(msg.players[i]);
 else if(msg.playerId||msg.id)SG.upsertPvpOpponentFromServer(msg);
 break;
case'match:dead':for(var j=0;j<(SG.state.pvpOpponents||[]).length;j++)if(SG.state.pvpOpponents[j].id===msg.playerId||SG.state.pvpOpponents[j].name===msg.name)SG.state.pvpOpponents[j].alive=false;break;
case'match:finish':stopSnap();_active=false;SG.state.pvpRoom=null;SG.state.pvpResult=msg;
 if(SG.gameOverEl){SG.state.gameOver=true;if(SG.finalScoreEl)SG.finalScoreEl.textContent=Math.floor(SG.state.score);
 var ranks='';for(var k=0;k<(msg.ranking||[]).length;k++){var r=msg.ranking[k];ranks+='<div style=\'color:#fff;font-size:14px;margin:4px 0\'>'+(['🥇','🥈','🥉'][k]||(k+1)+'.')+' '+r.name+' — '+r.distance+'m</div>';}
 var old=SG.gameOverEl.querySelector('.pvp-ranks');if(old)old.remove();var d=document.createElement('div');d.className='pvp-ranks';d.innerHTML=ranks;SG.gameOverEl.appendChild(d);SG.gameOverEl.classList.add('visible');} break;
}}

// ─── Override Phase 1 functions (deferred to after UI loads) ──

setTimeout(function(){
  // Intercept showPvpLobby to connect+fetch server rooms
  var _origShow=SG.showPvpLobby;
  SG.showPvpLobby=function(){SG.connectPvp();_origShow.apply(this,arguments);setTimeout(function(){send({type:'room:list'});},300);};

  // Route all PVP room ops through WebSocket
  SG.pvpListRooms=function(){send({type:'room:list'});};
  var _origCreate=SG.createLocalPvpRoom;SG.createLocalPvpRoom=null;
  SG.pvpCreateRoom=function(name){send({type:'room:create',name:name||'Sprint'});};
  var _origJoin=SG.joinLocalPvpRoom;SG.joinLocalPvpRoom=null;
  SG.pvpJoinRoom=function(id){send({type:'room:join',roomId:id});};

  // Override ready toggle to go through WebSocket
  var _origToggle=SG.togglePvpReady;
  SG.togglePvpReady=function(){if(roomId){var r=SG.state.pvpRoom;if(!r)return;var myId=SG.account?SG.account.email:'';for(var i=0;i<r.players.length;i++)if(r.players[i].id===myId||r.players[i].local){var nr=!r.players[i].ready;r.players[i].ready=nr;send({type:'room:ready',roomId:roomId,ready:nr});if(SG.renderPvpLobby)SG.renderPvpLobby();return;}}else _origToggle&&_origToggle.apply(this,arguments);};

  // Override start to go through WebSocket
  var _origStart=SG.startPvpRace;
  SG.startPvpRace=function(){
    if(roomId){send({type:'room:start',roomId:roomId});return;}
    _origStart.apply(this,arguments);
  };

  // Override isPvpRoomReady to check server data too
  var _origReady=SG.isPvpRoomReady;
  SG.isPvpRoomReady=function(room){var r=room||SG.state.pvpRoom;return r&&r.players&&r.players.length>=2&&r.players.every(function(p){return p.ready;});};

  // Hook game over to send match:dead
  var _origGO=SG.gameOver;
  SG.gameOver=function(){if(_active&&roomId)send({type:'match:dead',roomId:roomId,distance:Math.floor(SG.state.score)});if(_origGO)_origGO.apply(this,arguments);};

  // Re-render lobby when server sends data
  if(SG.renderPvpLobby)SG.renderPvpLobby();
},1500);

})();
