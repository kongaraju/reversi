/**
 * @author Raju K
 */

var fbModule = function() {
	this.init = function(id, callback) {
		this.callback = callback
		var module = this;

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

		if (typeof id === 'function')
			return;

		FB.init({
			appId : id,
			cookie : true,
			xfbml : true,
			oauth : true,

		});

		FB.getLoginStatus(function(response) {
			if (response.status === 'connected') {
				var uid = response.authResponse.userID;
				var accessToken = response.authResponse.accessToken;
				module.checkDB();
			} else if (response.status === 'not_authorized') {

				module.callback.call(this, {
					status : "not_authorized"
				})
			} else {

				module.callback.call(this, {
					status : "not_authorized"
				})
			}
		});

		FB.Event.subscribe('auth.login', function(response) {
			module.checkDB();

		});

		FB.Event.subscribe('auth.logout', function(response) {
			module.callback.call(this, {
				status : "not_authorized"
			})

		});

	}

}

fbModule.prototype.getInfo = function(res) {
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
		"email" : res.email,
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
fbModule.prototype.checkDB = function() {
	var module = this;

	FB.api('/me', function(res) {

		var fbdata = module.getInfo(res);
		$.ajax({
			url : "php/fblogin.php",
			type : "post",
			data : {
				userProfile : JSON.stringify(fbdata)
			},

			success : function(response, textStatus, jqXHR) {

				var resp = JSON.parse(response);

				module.callback.call(this, {
					status : "connected",
					data : fbdata
				})

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
				module.callback.call(this, {
					status : "DB_err"
				})

				console.log("The following error occured: " + textStatus,
						errorThrown);
			},

			complete : function() {
				// enable the inputs
				// console.log("user authentication successful.")

			}
		});

	});

}

fbModule.prototype.authenticate = function(perms) {

	FB.login(function(response) {
		if (response.authResponse) {
			// console.log('Authenticated!');

		} else {
			module.callback.call(this, {
				status : "reject_err"
			})
			// console.log('User cancelled login or did not fully authorize.');
		}
	}, {
		scope : perms
	});
}

var akp_fb = new fbModule;

akp_fb.init(id, callback)

function fbAuthentication(resp) {
	switch (resp.status) {
	case "connected":
		break;
	case "not_authorized":
		break;
	case "DB_err":
		break;
	case "reject_err":
		break;
	default:

	}
}
