function flipCoin(cell, coin) {

	var coinEl = $("<div/>").addClass(coin);
	if ($(cell).is(":empty")) {
		$(cell).html(coinEl)
	} else if ($(cell).children("div").hasClass(coin)) {
		return;
	} else {

		$(cell).empty().append(coinEl);
		coinEl.addClass("flipanim");
	}
}

/*
 * connection to server
 */
function conOpen(e) {
	// start app logic
	// this.isOpened = true;
	// console.log("connection opened")

	clearTimeout(conExpire);
}
function conError() {
	// show err msg
}
function conClose() {
	// show err msg and logout
	// this.isOpened = false;
	clearTimeout(conExpire);
	alert("server down, please try after some time");
}

function send(obj) {
	// console.log(obj);
	// console.log(clientid);
	var service = "reversi";
	var jsonstring = JSON.stringify(obj);
	var sendBuffer = new ArrayBuffer(jsonstring.length + 4 + 12);
	var dv = new DataView(sendBuffer);

	dv.setInt32(0, clientid);

	if (service.length < 12) {
		for ( var i = 0; i < (12 - service.length); i++) {
			service += ' ';
		}
	}// fill space for missing chars
	for ( var i = 0; i < service.length; i++) {
		dv.setUint8(i + 4, service.charCodeAt(i));
	}
	for ( var i = 0; i < jsonstring.length; i++) {
		dv.setUint8(i + 16, jsonstring.charCodeAt(i));
	}
	ws.send(sendBuffer);

	return;

}
function recieveMessage(e) {

	var recvBuffer = e.data;
	var dv = new DataView(recvBuffer);
	var clientid = dv.getInt32(0, false);

	var service = new String();
	for ( var i = 4; i < 16; i++) {
		service += String.fromCharCode(dv.getUint8(i));
	}
	var jsonstr = "";
	for ( var i = 16; i < e.data.byteLength; i++) {
		jsonstr += String.fromCharCode(dv.getUint8(i));
	}

	var obj = eval('(' + jsonstr.toString() + ')');
	// JSON.parse(jsonstr.toString());

	service = service.toString().replace(/[\x00-\x1F\x80-\xFF]/g, "");
	obj.service = service.substring(0, service.indexOf(' ')) || service;

	obj.clientid = clientid;
	return obj;

}

function handleMessage(e) {
	app.handleMessage(e)
}

var helpView = function() {
	this.el = $("#log");
	this.defaults = {
		align : "bottomRight",
		timeout : 10000,
		closeOnClick : false,

	};

}
helpView.prototype.getMsg = function(msg) {
	var mesgEl = $("<p/>").addClass("log-msg");
	this.el.html(mesgEl);
	if (typeof msg === "object") {
		mesgEl.html(msg.text);
	} else if (typeof msg === "string") {
		mesgEl.html(msg);
		this.removeMsg(mesgEl);
	} else {
		// console.log(typeof msg);
	}
	return mesgEl;

}
helpView.prototype.alert = function(msg) {

	var mesgEl = this.getMsg(msg);
	mesgEl.css({
		"background-color" : "#FFF",
		"color" : "#29D3B8"
	})

	return mesgEl;
}
helpView.prototype.success = function(msg) {
	var mesgEl = this.getMsg(msg);
	mesgEl.css({
		"background-color" : "#2dd700",
		"color" : "#fff"
	})

	return mesgEl;

}
helpView.prototype.error = function(msg) {
	var mesgEl = this.getMsg(msg);
	mesgEl.css({
		"background-color" : "#FF4040",
		"color" : "#fff"
	})

	return mesgEl;

}
helpView.prototype.info = function(msg) {
	var mesgEl = this.getMsg(msg);
	mesgEl.css({
		"background-color" : "#0772a1",
		"color" : "#fff"
	})

	return mesgEl;

}
helpView.prototype.warning = function(msg) {
	var mesgEl = this.getMsg(msg);
	mesgEl.css({
		"background-color" : "#FFa400",
		"color" : "#fff"
	})

	return mesgEl;

}
helpView.prototype.removeMsg = function(el) {
	setTimeout(function() {
		el.remove();
	}, 10000);
}

var log = new helpView;

/*
 * List of boards
 */

var boards = function() {
	this.boards = {};
	this.count = 0;
}
boards.prototype.add = function(obj) {
	var board = this.boards[obj.boardid] = {
		id : obj.boardid,
		name : obj.boardname,
		player1 : obj.player1,
		player2 : obj.player2,
		started : obj.started || "false",

	};

	if (obj.playercount == 2)
		board.started = "true";

	app.addNewBoard(board);
	if (this.count == obj.boardid)
		app.hideLoadingMsg();

}
boards.prototype.addPlayer = function(boardid, loginid, position, pcount) {

	var board = this.boards[boardid];
	board["player" + position] = loginid;
	app.incPlayer(loginid, boardid, "player" + position);

	if (pcount == 2)
		app.hideBoard(boardid);
}
boards.prototype.remove = function(id, remove) {
	app.removeBoard(id, remove);
	// delete this.boards[id];
}
boards.prototype.get = function(id) {
	return this.boards[id];
}

/*
 * Game
 * 
 */

var game = function() {
	this.id = null;
	this.playerCount = 0;
	this.self = null;
	this.blackCount = 0;
	this.whiteCount = 0;
	this.canUpdate = true;
	this.changed = false;
	this.timer = null;
	this.updater = null;
	this.possibles = [];
	this.players = {
		player1 : {},
		player2 : {},
	}
}

game.prototype.init = function(board) {
	this.board = board;

	$("#start").hide();
	$(".board-table td").empty().attr("data-toggle", "tooltip").removeAttr(
			"title");
	$(".count").empty().hide();
	$(".pawns").hide();
	this.disableSelect();

	$("#leave").show().bind('click', this.board.id, this.leave);

	for ( var i = 1; i <= 4; i++)
		if (board['player' + i])
			this.addPlayer(board['player' + i], "player" + i);

}

game.prototype.addPlayer = function(id, player) {
	this.board[player] = id;
	this.playerCount++;

	this.showStart();
	this.alivePawns(player);
	this.players[player]["id"] = id;
	this.players[player]["status"] = true;

	$("#" + player + "_pic").attr("src",
			"https://graph.facebook.com/" + id + "/picture");

	$("." + player + "_set").show();

}
game.prototype.removePlayer = function(resp) {
	var setee = ".player" + resp.playerid + "_set";
	$(setee).hide();
	this.disableSelect();
	// $("").remove();
	log.error("player left the board");

}
game.prototype.alivePawns = function(player) {

}
game.prototype.start = function(e) {
	app.startGame(e.data);

}

game.prototype.showStart = function() {
	if (this.playerCount > 1) {
		$(".start_wait").hide();
		$("#start").show().bind('click', this.board.id, this.start)
		$(".count").append("0").show();
	}

}
game.prototype.leave = function(e) {
	app.leavePlayer(e.data);
}
game.prototype.play = function() {

	$("#start").hide();
	$("#leave").show().bind('click', this.board.id, this.leave);

}
game.prototype.stop = function() {

}
game.prototype.update = function(board) {
	var values = board.map, value, cell;

	for (v in values) {
		value = values[v].value;
		cell = values[v].cellid;
		if (value == 0)
			$("#pos" + cell).empty();
		else if (value == 1)

			flipCoin("#pos" + cell, "wcoin");
		// $("#pos"+cell).html("<div class=wcoin></div>");
		else if (value == 2)
			flipCoin("#pos" + cell, "bcoin");
		// $("#pos"+cell).html("<div class=bcoin></div>");
	}

	$(".count.white").html(board.whitecoins);
	$(".count.black").html(board.blackcoins);

}

game.prototype.enableTurn = function(turn) {
	var self = this;

	$("#player" + turn.playerid + "_pic").addClass("blink2").css({
		"-webkit-animation-play-state" : "running",
		"-moz-animation-play-state" : "running",
		"-o-animation-play-state" : "running",
		"animation-play-state" : "running",
	});
	this.disableSelect();
	this.possibles = turn.possible_cells;
	if (!this.possibles.length) {
		app.flipReq(-1);
		log.warning("You don't have possible slots, your turn passed.");
		return;
	}

	if (turn.playerid == this.self) {
		this.startCountDown();
		for (p in this.possibles) {
			$("#pos" + this.possibles[p]).addClass("cell-active").attr("title",
					"Possible slot.").bind("click", self, self.selectPosition);
		}
	}

}

game.prototype.animateCoin = function(pawn, list) {
	this.canUpdate = false;

	moveAnimate("#p" + pawn, list, 0);

}

game.prototype.selectPosition = function(e) {

	var id = this.id;

	var position = id.substr(3, id.length - 1);

	app.flipReq(position);
	e.data.disableSelect();

}
game.prototype.disableSelect = function() {
	$(".board-table td").removeClass("cell-active").removeAttr("title").unbind(
			"click");
	this.possibles = [];
	clearTimeout(this.timer);
	clearInterval(this.updater);
	$(".countDown").hide();
}

game.prototype.startCountDown = function() {

	var self = this;
	var items = this.possibles;

	$(".countDown").show();
	$("#timer").html("30");
	clearTimeout(self.timer);
	self.timer = setTimeout(function() {
		self.disableSelect();
		var cell = items[Math.floor(Math.random() * items.length)]
		app.flipReq(cell);
	}, 30000)
	var i = 30;
	clearInterval(self.updater);
	self.updater = setInterval(function() {
		$("#timer").addClass("text-error").html(" " + i--);
	}, 1000)
}

/*
 * app
 */

var Application = function() {
	this.me = null;
	this._me = {
		joined : false,
		boardCreator : true,
		boardName : null
	};
	this.map = {};
	this.init = function() {
		var self = this;
		$("#pagain").bind("click", function() {

			$(".gameEnd, .lost, .won").hide();
			$(".available-boards").show();
			self.resetBoard();
			self.setBoards();
		})

	}
	this.init();
}
Application.prototype.showAnimation = function() {
	$(".logboard").hide();
	$(".auth-system").append("<p class=text-info>please wait Loading..</p>");

}

Application.prototype.addOnlinePlayer = function(recvd) {
	var img = $("<img/>").attr('src',
			"https://graph.facebook.com/" + recvd.loginid + "/picture")
			.addClass("img-rounded");
	var el = $("<li/>").attr("data-fbid", recvd.loginid).append(img).addClass(
			"oplyr").prependTo(".players-list ul");

}
Application.prototype.removeOnlinePlayer = function(recvd) {

	$(".players-list ul").find("li[data-fbid=" + recvd.loginid + "]").remove();

}
Application.prototype.renderLeaderBoard = function(lb) {

	var list = lb.leader_list;
	$(".leaders-list ul").empty();

	for (l in list) {
		var img = $("<img/>").attr('src',
				"https://graph.facebook.com/" + list[l].loginid + "/picture")
				.addClass("img-rounded");
		var score = $("<span/>").append(list[l].score);
		var el = $("<li/>").attr("data-fbid", list[l].loginid).append(img)
				.append(score).addClass("oplyr").appendTo(".leaders-list ul");
	}

}

Application.prototype.setBoards = function() {
	$(".content section").hide();
	$(".available-boards").show();
	var self = this;
	$(".newBoard").removeAttr("disabled")/*
											 * .bind("click", function() {
											 * $(this).attr("disabled", true);
											 * self.createBoard(); //
											 * self.openBoard(); });
											 */
}
Application.prototype.resetBoard = function() {
	this.set("joined", false);
	this.set("boardCreator", false);
	this.set("boardName", null);
	this.set("playerid", null);
	this.set("boardid", null);
	this.sgame = null;

	$("#player1_set,#player2_set,#start,#leave").hide();
	$("#player1_pic,#player2_pic").removeAttr("src");

}

Application.prototype.showBoards = function(e) {
	$(".auth-system, .help").hide();
	// var self = this;
	var self = e.data;
	$(".newBoard").removeAttr("disabled").bind("click", function() {
		$(this).attr("disabled", true);
		self.createBoard();
		// self.openBoard();
	});

	$(".available-boards, .content, .app").show();
}
Application.prototype.showHelp = function() {
	$(".auth-system").hide();
	$(".help, .content, .app").show();
	$(".navBoards").show();
	$("#feedback_btn").show();
	$("#goBoards").bind("click", this, this.showBoards)

}
Application.prototype.addNewBoard = function(board) {
	var self = this;

	var playercard = $("<div/>").addClass("brdPlayers");

	for ( var i = 1; i <= 4; i++) {
		var str = "player" + i;
		if (!board[str])
			continue;

		$("<img/>").attr("src",
				"https://graph.facebook.com/" + board[str] + "/picture")
				.addClass("img-rounded").appendTo(playercard);
	}

	var joinbtn;

	if (board.started == "false") {

		joinbtn = $("<button/>").append("Enter").addClass(
				"btn btn-success pull-right joinbtn").bind("click", function() {
			self.joinPlayer(board.id);
		})
	} else {
		joinbtn = $("<p/>").append("  : playing..").addClass("pmsg");
	}
	var brdname = $("<div/>").addClass("brdname well").append(
			"<p class=pull-left>" + board.name + "</p>").append(joinbtn);

	$("<div/>").addClass("boardPanel thumbnail").append(brdname).append(
			playercard).attr("data-bid", board.id).prependTo(".boards-list");
	if ($(".available-boards .emptymsg").length)
		$(".available-boards .emptymsg").remove();

}
Application.prototype.createBoard = function() {
	var self = this;
	var playerpic = $("<img/>").attr("src",
			"https://graph.facebook.com/" + this._me["id"] + "/picture")
			.addClass("img-rounded")
	var playercard = $("<div/>").addClass("brdPlayers").append(playerpic);
	var input = $("<input/>").attr({
		type : "text",
		placeholder : "Enter board name.."
	}).bind("keypress", function(e) {
		if (e.keyCode == 13) {
			var name = $(this).val();
			$(this).attr("disabled", true);

			if (name)
				self.openBoard(name);
			else
				alert("Enter board name to create new board");

		}
	});

	var submit = $("<button/>").append("create").addClass("btn btn-success")
			.bind("click", function() {

				var name = input.val();
				if (name)
					self.openBoard(name);
				else
					alert("Enter board name to create new board");
			});
	var cancel = $("<button/>").append("cancel").addClass("btn btn-danger")
			.bind("click", function() {
				$(".newBoard").removeAttr("disabled");
				self.removeTemp();
			});

	var brdname = $("<div/>").addClass("brdname well well-small").append(input)
			.append(submit).append(cancel);

	$("<div/>").addClass("boardPanel thumbnail tempboard").append(brdname)
			.append(playercard).prependTo(".boards-list");
	if ($(".available-boards .emptymsg").length)
		$(".available-boards .emptymsg").remove();
}
Application.prototype.incPlayer = function(id, bid, player) {
	var playerpic = $("<img/>").attr("src",
			"https://graph.facebook.com/" + id + "/picture").addClass(
			"img-rounded");
	var el = $(".boardPanel[data-bid=" + bid + "]");
	if (el.length)
		el.children(".brdPlayers").append(playerpic);

	if (this.get("joined"))
		if (this.get("boardid") == bid)
			this.addGamePlayer(id, player)

}
Application.prototype.hideBoard = function(bid) {
	$(".boardPanel[data-bid=" + bid + "]").find(".joinbtn").remove();
}
Application.prototype.removeBoard = function(bid, remove) {

	// console.log($(".boardPanel[data-bid=" + bid + "]").length);
	if (remove) {
		$(".boardPanel[data-bid=" + bid + "]").remove();
	} else {
		var playing = $("<p/>").append("  : playing..").addClass("pmsg");
		$(".boardPanel[data-bid=" + bid + "]").find(".joinbtn").remove().end()
				.find(".pmsg").remove();
		$(".boardPanel[data-bid=" + bid + "]").find(".brdname").append(playing);
	}
	if (this.get("joined"))
		if (this.get("boardid") == bid)
			this.sgame.play();
}
Application.prototype.addGamePlayer = function(id, player) {
	this.sgame.addPlayer(id, player);

}
Application.prototype.showEmptyPanel = function() {
	$(".available-boards")
			.append(
					"<p class='emptymsg alert alert-info'>There are no available boards, create a board to play</p>");
}
Application.prototype.showLoadingBoards = function() {
	/*
	 * $(".available-boards").append( "<p class='loadingboards alert alert-success'>Please
	 * wait loading boards</p>");
	 */

}
Application.prototype.hideLoadingMsg = function() {
	$(".loadingboards").remove();
}
Application.prototype.removeTemp = function() {
	$(".tempboard").remove();
}
Application.prototype.showboard = function() {

	$(".available-boards").slideUp();
	$(".game").slideDown();

}
Application.prototype.throwErr = function(ecode) {
	if (ecode == 1) {
		this.hide();
		this.showExisted();
	}

}

Application.prototype.gameOver = function(resp) {
	$(".content section").hide();

	// $("game").hide();

	if (resp.winner == this.sgame.self)
		$(".gameEnd, .gameEnd .won").show();
	else
		$(".gameEnd, .gameEnd .lost").show();

	this.getLeaderBoard();

}

Application.prototype.showExisted = function() {

	alert("player already loggedin on other mechine.");
}

Application.prototype.hide = function() {
	$(".logboard,.auth-system,.available-boards, .content, .app,.game").hide();

}
Application.prototype.showUser = function(id, name) {
	$("#me-pic").attr("src",
			"https://graph.facebook.com/" + id + "/picture?width=32&height=32")
			.addClass("img-rounded");
	$("#me-name").append(name);
}

Application.prototype.initGame = function() {
	this.showboard();
	this.set("joined", true);

	var board = boardlist.get(this.get("boardid"));
	this.sgame = new game();
	this.sgame.init(board);
}

Application.prototype.createUUID = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}
Application.prototype.startGame = function(bid) {
	var obj = {
		mesgtype : "request",
		request : "start",
		cookie : this.createUUID(),
		boardid : bid
	}
	send(obj);
	this.map[obj.cookie] = "start";
}

Application.prototype.flipReq = function(cell) {
	var obj = {
		mesgtype : "request",
		request : "flip",
		cookie : this.createUUID(),
		boardid : this.get("boardid"),
		playerid : this.get("playerid"),
		cellindex : cell,

	}

	if (this.get("isPlaying")) {
		send(obj);
		this.map[obj.cookie] = "flip";
	}
	$(".pyr_pic").removeClass("blink2").css({
		"-webkit-animation-play-state" : "paused",
		"-moz-animation-play-state" : "paused",
		"-o-animation-play-state" : "paused",
		"animation-play-state" : "paused",
	});
}

Application.prototype.login = function(data) {

	var obj = {
		mesgtype : "request",
		request : "login",
		cookie : this.createUUID(),
		loginid : data.id,
		name : data.first_name,
	}
	send(obj);
	this.map[obj.cookie] = "login";
	this.showUser(data.id, data.first_name);

}
Application.prototype.getBoards = function() {
	var obj = {
		mesgtype : "request",
		request : "get_board_list",
		cookie : this.createUUID(),
	}
	send(obj);
	this.map[obj.cookie] = "boards";
}

Application.prototype.openBoard = function(name) {

	var obj = {
		mesgtype : "request",
		request : "open_board",
		cookie : this.createUUID(),
		loginid : this._me["id"],
		name : name
	}
	send(obj);
	this.map[obj.cookie] = "openBoard";
	this._me["boardName"] = name;

}
Application.prototype.joinPlayer = function(b_id) {

	var obj = {
		mesgtype : "request",
		request : "join",
		cookie : this.createUUID(),
		loginid : this.get("id"),
		boardid : b_id
	}
	send(obj);
	this.map[obj.cookie] = "join";
	this.set("boardid", b_id);
	this.initGame();

}
Application.prototype.leavePlayer = function(b_id) {
	var obj = {
		mesgtype : "request",
		request : "leave",
		cookie : this.createUUID(),
		loginid : this.get("id"),
		boardid : b_id
	}
	send(obj);
	this.map[obj.cookie] = "leave";
}
Application.prototype.getLeaderBoard = function() {
	var obj = {
		mesgtype : "request",
		request : "get_leader_board",
		cookie : this.createUUID(),

	}
	send(obj);
	this.map[obj.cookie] = "leaderboard";
}
Application.prototype.handleMessage = function(msg) {
	var recvd = recieveMessage(msg);
	console.log(recvd);

	if (!clientidRecvd) {
		clientid = recvd.clientid;
		clientidRecvd = true;

		// console.log("client id recvd");
	} else if (recvd.mesgtype == "event") {
		// console.log(recvd.eventtype);
		switch (recvd.eventtype) {
		case "new_board":
			boardlist.add(recvd);
			if (this.get("boardCreator"))
				if (recvd.boardname == this.get("boardName")) {
					this.joinPlayer(recvd.boardid)
					this.set("joined", true);
					this.removeTemp();
				}

			break;
		case "player_join":
			boardlist.addPlayer(recvd.boardid, recvd.loginid, recvd.playerid,
					recvd.playercount);
			break;
		case "player_leave":
			this.sgame.removePlayer(recvd);
			break;
		case "board_started":

			boardlist.remove(recvd.boardid, false);
			log.success("Lets play the game.");
			break;
		case "board_update":
			// console.log(recvd);
			this.sgame.update(recvd);
			break;

		case "board_deleted":
			boardlist.remove(recvd.boardid, true);
			break;
		case "turn_event":
			log.info(":) Its your Turn, Lets select!.");
			this.sgame.enableTurn(recvd);
			break;

		case "move_not_possible":
			log.error("You cannot move the coin");
			this.sgame.moveIgnore();
			break;
		case "game_over_event":
			this.gameOver(recvd);
			this.set("isPlaying", false);
			break;
		case "player_login":
			this.addOnlinePlayer(recvd);
			break;
		case "player_logout":
			this.removeOnlinePlayer(recvd);
			break;
		case "service_down":
			if (recvd.service_name = "reversi") {
				$("body").hide();
				alert("server down, please try after some time");
			}
			break;
		default:
			// console.log("event type not found");

		}

	} else {
		// console.log(this.map[recvd.cookie]);
		switch (this.map[recvd.cookie]) {
		case "login":

			if (recvd.mesgtype == "error") {
				// console.log(recvd.emsg);
				app.throwErr(1);
			} else {
				// console.log(recvd);

				this.showHelp();
				this.getBoards();
				this.getLeaderBoard();
				// this.showBoards();

			}
			break;
		case "boards":
			if (recvd.board_count == 0)
				this.showEmptyPanel();
			else if (recvd.board_count) {
				// console.log("board_count: " + recvd.board_count);
				boardlist.count = recvd.board_count;
				this.showLoadingBoards();
			} else {
				boardlist.add(recvd);
				// console.log("board Recieved");
			}
			// console.log(recvd);

			break;
		case "openBoard":
			// console.log(recvd);
			if (recvd.status == "success")
				this._me["boardCreator"] = true;

			break;
		case "join":
			// console.log(recvd);
			// this.initGame();

			this.set("playerid", recvd.playerid);
			this.set("isPlaying", true);
			this.sgame.self = recvd.playerid;

			break;
		case "start":
			// console.log(recvd);
			break;
		case "leave":
			this.resetBoard();
			this.setBoards();
			this.set("isPlaying", false);
			break;
		case "flip":
			break;
		case "leaderboard":

			this.renderLeaderBoard(recvd);

			break;
		default:
			// console.log(" response not recognised");
		}
	}
}

Application.prototype.logout = function() {
	var obj = {
		mesgtype : "request",
		request : "logout",
		cookie : this.createUUID(),
		loginid : this.get("id"),
	}
	send(obj);
	this.map[obj.cookie] = "logout";
}
Application.prototype.setInfo = function(info) {
	this._me = info;
}
Application.prototype.get = function(prop) {
	if (prop)
		return this._me[prop];
	else
		return this._me;
}
Application.prototype.set = function(prop, value) {
	this._me[prop] = value;
	return;
}

/*
 * allPlayers
 */

var list = function() {
	this.users = {};
}
list.prototype.add = function(user) {
	this.users[user.id] = user;
}
list.prototype.get = function(id) {
	return this.users[id];
}

/*
 * user
 */




var app = new Application;
var boardlist = new boards;
var userslist = new list;

var clientid = null;
var clientidRecvd = false;

if ("WebSocket" in window)
{
	var conExpire = setTimeout(function() {
		alert("server down, please try after some time");
	}, 3000);

var ws = new WebSocket("ws://www.antkorp.in:443");
ws.binaryType = 'arraybuffer';
ws.onopen = conOpen;
ws.onerror = conError;
ws.onclose = conClose;
ws.onmessage = handleMessage;

}
else{
	
	
	
	alert("Oops! application is not supported by your browser. Please upgrade your browser!")
}

/*
 * g-plus one
 */

(function() {
	var po = document.createElement('script');
	po.type = 'text/javascript';
	po.async = true;
	po.src = 'https://apis.google.com/js/plusone.js';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(po, s);
})();





function signinCallback(authResult) {
	  if (authResult['access_token']) {
	    // Successfully authorized
	    // Hide the sign-in button now that the user is authorized, for example:
	    document.getElementById('signinButton').setAttribute('style', 'display: none');
	    console.log(authResult);
	  } else if (authResult['error']) {
	    // There was an error.
	    // Possible error codes:
	    //   "access_denied" - User denied access to your app
	    //   "immediate_failed" - Could not automatially log in the user
	     console.log('There was an error: ' + authResult['error']);
	  }
	}




/*
 * Feed back
 */
$("#post_fk").bind("click", send_feedback);

function send_feedback(e) {
	var cmnt = $("#feedback").val();
	$("#feedback").empty();
	if (cmnt) {
		var feedback = {
			id : app.get("id"),
			name : app.get("first_name"),
			email : app.get("email"),
			stmt : "Reversi : " + cmnt,
		}
		$.ajax({
			url : "../php/feedback.php",
			type : "post",
			data : {
				userFeedback : JSON.stringify(feedback)
			},

			success : function(response, textStatus, jqXHR) {

				console.log("feedback recorded successfully "
						+ response.message)
			},

			error : function(jqXHR, textStatus, errorThrown) {

				console.log(
						"The following error occured while recording feedback : "
								+ textStatus, errorThrown);
			},

			complete : function() {

			}
		});
	}

}

/*
 * Login system
 */

var fbusername;
var fbbtn = $("<button/>").append(
		"<i class='facebook_24'></i><span> Join with facebook</span>")
		.addClass("facebook").bind('click', facebookLogin);
var note_sec = $("<p/>").append("we do not send emails or store your details.")
		.addClass("text-error");
// var asi = $("<span/>").append("Do you want to Play ascma").addClass("asi");
var fr = $('<div/>').addClass("logboard").append(fbbtn).append(note_sec)
		.appendTo(".auth-system").hide();

$("body").append('<div id="fb-root"></div>');

$("#shareApp").bind("click", shareWithFacebook);

/*
 * var appload = $('<div id="loadbar" class="modal"></div>') .append( "<span>Please
 * wait..</span><br/><div class='apploadbar'><div class='loadpercentage'></div></div><br/><span
 * class='apploadstatus'>user logging in</span>") .appendTo("body").css({
 * "display" : "none" });
 * 
 * 
 * Sign In to antkorp
 */
// .append('<div class="fb-login-button" data-size="large"
// scope="email,user_birthday,user_work_history" >Login with Facebook</div>')
// $('<div id="logOverlay" class="overlay"></div>').appendTo('body');
window.fbAsyncInit = function() {
	FB.init({
		appId : 609820245699095,
		cookie : true,
		xfbml : true,
		oauth : true,

	});

	FB.getLoginStatus(function(response) {
		if (response.status === 'connected') {
			var uid = response.authResponse.userID;
			var accessToken = response.authResponse.accessToken;
			userfbCheck();
		} else if (response.status === 'not_authorized') {
			// the user is logged in to Facebook,
			// but has not authenticated your app
			// alert("not loggedin into app");
			$('.logboard').fadeIn('fast');
		} else {
			// the user isn't logged in to Facebook.
			// alert("user not loggedin into facebook ");
			$('.logboard').fadeIn('fast');
		}
	});

	FB.Event.subscribe('auth.login', function(response) {
		//userfbCheck();

	});

	FB.Event.subscribe('auth.logout', function(response) {
		$('#logboard, #logOverlay').fadeIn('fast');
	});
};

function send_message_FB() {
	FB
			.ui({
				method : 'send',
				name : "play reversi online",
				link : 'http://www.reversi.com/',
				description : 'Hi friends lets play reversi game online. Do you want to play with me, login to reversi.com',
			});
	// console.log(ids);
}

function get_friends() {
	FB.api('/me/friends', function(resp) {
		var ids = [];
		var fds_list = resp.data;
		for ( var i = 0; i < fds_list.length; i++) {
			ids.push(fds_list[i].id);
		}
		shareWithFacebook(ids)

	});
}

function shareWithFacebook(ids) {
	FB
			.ui(
					{
						method : 'apprequests',
						message : 'Hi friends lets play reversi game online. come and join with me www.onlinereversi.com'
					}, requestCallback);
}

function requestCallback(resp) {
	// console.log(resp);
}

function facebookLogin() {
	// app.showAnimation();
	FB.login(function(response) {
		if (response.authResponse) {
			// console.log('Authenticated!');
			// location.reload(); //or do whatever you want
			userfbCheck();
		} else {
			console.log('User cancelled login or did not fully authorize.');
		}
	}

	);
}

function getInfo(res) {
	var homeaddress = res.location;
	var work = res.work;
	var fbinfo = {
		id : res.id,
		"dob" : res.birthday,
		"dept" : '',
		middle_name : "",
		mob : "",
		organization : "",
		jobtitle : "",
		homeaddress : "",
		"email" : res.email || "email",
		"first_name" : res.first_name,
		"last_name" : res.last_name,
		"sex" : res.gender,
		"name" : res.first_name + " " + res.last_name
	};

	if (homeaddress) {
		fbinfo.homeaddress = homeaddress.name;
	}
	if (work) {
		if (work[0].employer)
			fbinfo.organization = work[0].employer.name;
		if (work[0].position)
			fbinfo.jobtitle = work[0].position.name;
	}

	return fbinfo;

	/*
	 * var fbemail = res.email; var fname = res.last_name; fbusername =
	 * fbemail.substring(0, fbemail.lastIndexOf('@')) + res.id; //
	 * console.log(newfbusername);
	 * 
	 * var fbData = { id : res.id, name : res.username, email : res.email,
	 * location : res.location, }
	 */

}

function userfbCheck() {
	// app.showAnimation();
	FB.api('/me', function(res) {
		// console.log(res);

		var fbdata = getInfo(res);
		app.setInfo(fbdata);

		$.ajax({
			url : "php/fblogin.php",
			type : "post",
			data : {
				userProfile : JSON.stringify(fbdata)
			},

			success : function(response, textStatus, jqXHR) {

				var resp = JSON.parse(response);

				app.login(fbdata);

				/*
				 * if (fbusername) { if (resp.message) { //
				 * akpauth.adduser(fbusername, fname); // appLoad(50,
				 * "Authenticating application..."); } else { if
				 * (!akpauth.loginstate) { // akpauth.loginuser(fbusername); //
				 * appLoad(100, "logging in user..."); } // prflview = false; } }
				 * else { console.log("User name not available"); }
				 */
			},

			error : function(jqXHR, textStatus, errorThrown) {

				console.log("The following error occured: " + textStatus,
						errorThrown);
			},

			complete : function() {
				// enable the inputs
				console.log("user authentication successful.")

			}
		});

	});

}

(function(d) {
	var js, id = 'facebook-jssdk';
	if (d.getElementById(id)) {
		return;
	}
	js = d.createElement('script');
	js.id = id;
	js.async = true;
	js.src = "http://connect.facebook.net/en_US/all.js";
	d.getElementsByTagName('head')[0].appendChild(js);
}(document));
