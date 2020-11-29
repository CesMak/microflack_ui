'use strict';
var app = app || {};

// The User model wraps the user resource representation.
app.cUser = Backbone.Model.extend({
    defaults: function() {
        return {
            'nickname': null
        }
    },
});
