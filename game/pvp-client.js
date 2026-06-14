// ===== ENDLESS RUNNER - PVP Client (WebSocket bridge) =====
(function(){'use strict';var SG=window.__SG=window.__SG||{};
var ws=null,roomId=null,snapTimer=null,_active=false;

// Immediately clear fake rooms so Phase 1 doesn't show them
SG.pvpRooms=[];

// ─── Bridges ───────────────────────────────────────

SG.setPvpRoomsFromServer=function(rooms){SG.pvpRooms=rooms||[];};
SG.setPvpRoomFromServer=function(room){SG.state.pvpRoom=room;};
SG.upsertPvpOpponentFromServer=function(data){
  if(!data||(!data.id&&!data.playerId))return;
  var pid=data.id||data.playerId;
  var ops=SG.state.pvpOpponents||[];
  for(var i=0;i<ops.length;i++){
    var o=ops[i];
    if(o.id===pid||o.name===data.name){o.distance=data.distance||(data.snapshot?data.snapshot.distance:0);o.lane=data.lane!==undefined?data.lane:(data.snapshot?data.snapshot.lane:1);o.isJumping=data.isJumping||(data.snapshot?data.snapshot.isJumping:false);o.isRolling=data.isRolling||(data.snapshot?data.snapshot.isRolling:false);o.alive=data.alive!==undefined?data.alive:(data.snapshot?data.snapshot.alive!==false:true);return;}
}};
SG.getLocalPvpSnapshot=function(){if(!_active||!SG.state.started||SG.state.gameOver)return null;return{lane:SG.state.currentLane,distance:Math.floor(SG.state.score),isJumping:SG.state.isJumping,isRolling:SG.state.isRolling,alive:!SG.state.gameOver,spectating:false,characterId:((SG.state||{}).selectedCharacter||'runner'),timestamp:Date.now()};};

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
 // Bypass localHost check — server already validated start
 if(SG.state.pvpRoom)SG.state.pvpRoom.localHost=true;
 if(typeof SG._originalStartPvpRace==='function'){SG._originalStartPvpRace();}break;
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

// ─── Override Phase 1 AFTER UI loads ───────────────

setTimeout(function(){
  // ── Save originals ──
  var _origShow=SG.showPvpLobby;
  SG._originalStartPvpRace=SG.startPvpRace; // preserve original
  var _origToggle=SG.togglePvpReady;
  var _origGO=SG.gameOver;

  // ── showPvpLobby: connect + pull server rooms ──
  SG.showPvpLobby=function(){
    SG.connectPvp();
    _origShow.apply(this,arguments);
    setTimeout(function(){send({type:'room:list'});},300);
  };

  // ── room:list request ──
  SG.pvpListRooms=function(){send({type:'room:list'});};

  // ── createLocalPvpRoom → WebSocket (keep name so renderPvpLobby buttons work) ──
  SG.createLocalPvpRoom=function(name){
    send({type:'room:create',name:(name||'Sprint').trim()||'Sprint'});
  };

  // ── joinLocalPvpRoom → WebSocket (keep name so renderPvpLobby buttons work) ──
  SG.joinLocalPvpRoom=function(id){
    send({type:'room:join',roomId:id});
  };

  // ── pvpCreateRoom / pvpJoinRoom: convenience aliases ──
  SG.pvpCreateRoom=function(name){SG.createLocalPvpRoom(name);};
  SG.pvpJoinRoom=function(id){SG.joinLocalPvpRoom(id);};

  // ── togglePvpReady → WebSocket ──
  SG.togglePvpReady=function(){
    if(roomId){
      var r=SG.state.pvpRoom;if(!r)return;
      var myId=SG.account?SG.account.email:'';
      for(var i=0;i<r.players.length;i++){
        if(r.players[i].id===myId||r.players[i].local){
          var nr=!r.players[i].ready;r.players[i].ready=nr;
          send({type:'room:ready',roomId:roomId,ready:nr});
          if(SG.renderPvpLobby)SG.renderPvpLobby();return;
        }
      }
    }else if(_origToggle){_origToggle.apply(this,arguments);}
  };

  // ── startPvpRace: user click → room:start; server reply → originalStartPvpRace ──
  SG.startPvpRace=function(){
    if(roomId){send({type:'room:start',roomId:roomId});return;}
    if(SG._originalStartPvpRace)SG._originalStartPvpRace.apply(this,arguments);
  };

  // ── isPvpRoomReady: check server data ──
  SG.isPvpRoomReady=function(room){
    var r=room||SG.state.pvpRoom;
    return r&&r.players&&r.players.length>=2&&r.players.every(function(p){return p.ready;});
  };

  // ── gameOver: send match:dead during PVP ──
  SG.gameOver=function(){
    if(_active&&roomId)send({type:'match:dead',roomId:roomId,distance:Math.floor(SG.state.score)});
    if(_origGO)_origGO.apply(this,arguments);
  };

  // ── Re-render ──
  if(SG.renderPvpLobby)SG.renderPvpLobby();
},1500);

})();
