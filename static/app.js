'use strict';

var app = app || {};

$(function() {
    // Create the models.
    app.userList    = new app.UserList();
    app.messageList = new app.MessageList();
    app.token       = new app.Token();
    //app.cuser       = new app.cUser();

    // Create the views.
    app.userListView    = new app.UserListView({collection: app.userList});
    app.messageListView = new app.MessageListView({collection: app.messageList});
    app.loginFormView   = new app.LoginFormView({model: app.token});
    app.postFormView    = new app.PostFormView({model: app.token});

    if (USE_SOCKETIO) {
        // Create the Socket.IO client that will update messages and users
        app.socket = io.connect(location.protocol + '//' + location.hostname + ':' + location.port);
        console.log("using socket io and: "+location.protocol + '//' + location.hostname + ':' + location.port);
        app.socket.on('updated_model', function(data) {
            if (data['class'] == 'User') {
                var user = new app.User();
                user.set(data.model);
                app.userListView.updateUser(user);
            }
            else if (data['class'] == 'Message') {
                var msg = new app.Message();
                msg.set(data.model);
                app.messageListView.updateMessage(msg);
            }
        });
        app.socket.on('expired_token', function() {
            // token expired, so we have to log user out
            app.token.set('token', null);
        });

        // While the user is logged in, periodically ping it on the server
        app.token.on('change:token', function() {
            // first clear the timer for the old token
            if (app.tokenRefreshTimer) {
                clearInterval(app.tokenRefreshTimer);
                app.tokenRefreshTimer = null;
            }

            var token = app.token.get('token');
            if (token) {
                // ping the user every 30 seconds
                // If the user registers, my_user is undefined .... :(
                // --> in this case id is only guessed by length....
                var cuser = JSON.parse(window.localStorage.getItem('cuser'));
                console.log("cuser"+cuser+" "+cuser["nickname"]);
                var my_user = app.userList.findWhere({nickname: cuser["nickname"]});
                var user_id = cuser["id"];
                if (typeof my_user !== 'undefined')
                {
                  user_id = my_user.id;
                }
                app.socket.emit('on_join_room', parseInt(cuser["roomid"]), parseInt(user_id), token);
                app.socket.emit('ping_user', token);
                app.tokenRefreshTimer = window.setInterval(function() {
                    app.socket.emit('ping_user', token);
                }, 30000);
            }
        });

        // Populate the initial message and user lists through the REST API
        app.userListView.refresh(function() {
            app.messageListView.refresh();
        });
    }
    else {
        // Set up auto-refresh for the user and message lists.
        app.userListView.refresh(function() {
            app.messageListView.refresh(function() {
                window.setInterval(function() {
                    app.userListView.refresh();
                }, 1000);
                window.setInterval(function() {
                    app.messageListView.refresh();
                }, 1000);
            });
        });
    }

    // Render the form views.
    app.loginFormView.render();
    app.postFormView.render();
    $('form[data-submit!=""]').submit(function(ev) {
        var form = $(ev.currentTarget);
        var target = app[form.data('submit')];
        var values = {};
        for (var i = 0; i < form.children().length; i++) {
            var control = form.children().eq(i);
            var name = control.attr('name') || control.attr('id');
            if (name) {
                values[name] = control.val();
                control.val('');
            }
        }
        target.trigger('submit', values);
        return false;
    });

    // Set up authentication in Backbone.sync
    var _sync = Backbone.sync
    Backbone.sync = function(method, model, options) {
        var token = app.token.get('token');
        if (token) {
            // If we have a token, then we have to use it, even for freely
            // accessible endpoints, as this is what indirectly informs the
            // server that the user is online.
            options.headers = options.headers || {};
            _.extend(options.headers, {'Authorization': 'Bearer ' + token})
        }
        var error_callback = options.error;
        options.error = function(xhr) {
            if (error_callback) {
                error_callback.apply(this, xhr);
            }
            if (xhr.status == 401) {
                // Token became invalid, so we have to log user out
                app.token.set('token', null);
            }
        }
        return _sync.call(this, method, model, options);
    }
});
