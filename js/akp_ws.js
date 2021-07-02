/**
 * @author Raju K
 */

/*
 * connection to server
 */
function conOpen(e) {
	// start app logic
	// this.isOpened = true;
	// console.log("connection opened")
}
function conError() {
	// show err msg
}
function conClose() {
	// show err msg and logout
	// this.isOpened = false;
}

function send(obj) {
	// console.log(obj);
	// console.log(clientid);
	var service = "astchma";
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

var ws = new WebSocket("ws://www.antkorp.in:443");
var clientid = null;
var clientidRecvd = false;
ws.binaryType = 'arraybuffer';
ws.onopen = conOpen;
ws.onerror = conError;
ws.onclose = conClose;
ws.onmessage = handleMessage;

var socketModule = function(statuschange, message) {
	this.statusupdate = statuschange;
	this.sendMessage = message;
	this.ws = new WebSocket("ws://www.antkorp.in:443");
	this.clientid = null;
	this.clientidRecvd = false;
	this.ws.binaryType = 'arraybuffer';
	this.ws.onopen = this.conOpen;
	this.ws.onerror = this.conError;
	this.ws.onclose = this.conClose;
	this.ws.onmessage = this.handleMessage;
	this.svcstatus = {};
	this.regServices = {};
}

socketModule.prototype.conOpen = function(e) {
	this.statusupdate.call(this, {
		status : "opened",
		data : e
	});
	this.services["ngw"] == true;
}

socketModule.prototype.conError = function(e) {
	this.statusupdate.call(this, {
		status : "error",
		data : e
	});

}
socketModule.prototype.conClose = function(e) {
	this.statusupdate.call(this, {
		status : "closed",
		data : e
	});
}
socketModule.prototype.send = function(msg) {
	if (this.regServices[msg.service])
		this.statusupdate.call(this, {
			status : "unreg_err",
			service : msg.service
		})
	else if (this.svcstatus[msg.service])
		this.statusupdate.call(this, {
			status : "svc_err",
			service : msg.service
		})
	else
		this.sendBuffer(msg);
}

socketModule.prototype.sendBuffer = function(obj) {
	var service = obj.service;
	delete obj.serivce;
	var jsonstring = JSON.stringify(obj);
	var sendBuffer = new ArrayBuffer(jsonstring.length + 4 + 12);
	var dv = new DataView(sendBuffer);

	dv.setInt32(0, this.clientid);

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
	this.ws.send(sendBuffer);

	return;

}
socketModule.prototype.toJSON = function(buffer) {

	var recvBuffer = buffer;
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

	// FIXME : handle try and catch

	service = service.toString().replace(/[\x00-\x1F\x80-\xFF]/g, "");
	obj.service = service.substring(0, service.indexOf(' ')) || service;

	obj.clientid = clientid;
	return obj;

}
socketModule.prototype.handleMessage = function(e) {

	var msg = this.toJSON(e.data);
	if (!this.clientidRecvd) {
		this.clientid = msg.clientid;
		this.clientidRecvd = true;
	} else if (msg.service == "ngw") {
		this.handleSvcStatus(msg);
	} else// need to handle one more condition for registered services.
	{
		this.sendMessage.call(this, msg);
	}
}


socketModule.prototype.handleSvcStatus=function(msg){
	this.statusupdate.call(this,{status:"svcupdate",service:msg.svcname,status:msg.status});
	if(msg.status=="up")
	   this.svcstatus[msg.svcname]=true;
	else if(msg.status=="down")
		this.svcstatus[msg.svcname]=false;
	
}
socketModule.prototype.register = function(services) {
	for (svc in services) {
		this.svcstatus[services[svc]] = true;
		this.regServices[services[svc]]=true;
	}
}




var akp_ws=new socketModule(handleStatusUpdates,handleMessage)


function handleStatusUpdates(resp){
	switch(resp.status){
	case "opened":
		break;
	case "error":
		break;
	case "
	}
}
