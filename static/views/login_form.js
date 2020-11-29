'use strict';
var app = app || {};

// LoginFormView handles the login form.
app.LoginFormView = Backbone.View.extend({
    el: '#login-form',
    template: _.template($('#login-form-template').html()),

    initialize: function(options) {
        _.bindAll(this, 'requestToken', 'submit', 'render');

        // The model for this view is a Token instance. The view is refreshed
        // any time a token is generated or revoked.
        this.model.bind('change', this.render);

        // The submit event fires when the form is submitted.
        this.bind('submit', this.submit);
    },

    requestToken: function(nickname, password) {
        // Send an API request to obtain a token.
        Backbone.sync('create', this.model, {
            url: '/api/tokens',
            headers: {'Authorization':
                'Basic ' + btoa(nickname + ':' + password)},
            success: function(response) {
                // A token was returned, so we update the Token model
                this.model.set('token', response.token);
                $('#login-error').html('');
            }.bind(this),
            error: function() {
                // A token was not returned, which means the credentials
                // were incorrect.
                $('#login-error').html(
                    'Invalid credentials. Please try again.');
                this.$el.find('#nickname').focus();
            }.bind(this),
        });
    },

    submit: function(args) {
        // This function authenticates the user.
        // We are using a very simplified auth. If the nickname already
        // exists, then we assume the user wants to login. If, on the other
        // side, the nickname is not known, the assumption is that the user
        // is registering a new account.
        if (!app.userList.findWhere({nickname: args.nickname})) {
            // Register a new account
            var user = new app.User({
                nickname: args.nickname,
                password: args.password,
                roomid: parseInt(args.roomid)
            });
            user.save({}, {
                success: function() {
                    // Once the new user is created, request a token
                    this.requestToken(args.nickname, args.password);
                }.bind(this),
            });
        }
        else {
            // If the nickname already exists, all we need to do is request
            // a token.
            this.requestToken(args.nickname, args.password);
        }

        // the id is approximated here..... 
        const cuser = {
            nickname: args.nickname,
            roomid: args.roomid,
            id: app.userList.length+1,
        }
        window.localStorage.setItem('cuser', JSON.stringify(cuser));
        //
        // var cuser = new app.cUser({nickname: args.nickname});
        // cuser.save();
        // Note cid is given by the client through backbone model, id comes from the server
        // Model loads asynchronous
        // token is stored inside the this.model
        // console.log(user); works but nothing else here!(attributes etc.)
    },

    render: function() {
        // If we haven't rendered the login form yet, do an initial render.
        if (this.$el.children().length == 0) {
            this.$el.html(this.template({}));
        }

        if (app.token.get('token')) {
            // If the user is already logged in, hide this form.
            this.$el.hide();
        }
        else {
            // If the user is not logged in, show the form and put focus on
            // the nickname field.
            this.$el.show();
            this.$el.find('#nickname').focus();
        }
        return this;
    }
});
