'use strict';
var app = app || {};

// PostFormView handles the message form.
app.PostFormView = Backbone.View.extend({
    el: '#post-form',
    template: _.template($('#post-form-template').html()),

    initialize: function(options) {
        _.bindAll(this, 'submit', 'render');

        // The model in this view is a Token instance. The view is refreshed
        // any time a token is generated or revoked.
        this.model.bind('change', this.render);

        // The submit event fires when the form is submitted.
        this.bind('submit', this.submit);
    },

    submit: function(args) {
        if (USE_SOCKETIO) {
            // Send the new message to the server as a Socket.IO event. The server
            // will in turn broadcast an update to all clients.
            console.log("message:");
            console.log(args.message);
            // console.log(app.token);    // prints token
            // console.log(app.userList); // prints
            // console.log(this.model);  // prints token
            console.log(app.userList);
            console.log(app.userList.findWhere({nickname: 'markus'}));
            console.log(app.userList.findWhere({nickname: 'markus'}).get('roomid'));
            app.socket.emit('post_message', {source: args.message}, app.token.get('token'));
        }
        else {
            var msg = new app.Message({source: args.message});
            msg.save();
        }
    },

    render: function() {
        // If we haven't rendered the post form yet, do an initial render.
        if (this.$el.children().length == 0)
            this.$el.html(this.template({}));

        if (app.token.get('token')) {
            // If the user is not logged in, show the form and put focus on
            // the nickname field.
            this.$el.show();
            this.$el.find('#message').focus();
        }
        else {
            // If the user is not logged in, hide this form.
            this.$el.hide();
        }
        return this;
    }
});
