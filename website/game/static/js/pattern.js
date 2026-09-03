'use strict';

var Pattern = {};

/**
 * @class
 * Mediator class
 */
Pattern.Mediator = (function () {
    var channels = {};

    var subscribe = function (channel, fn) {
        if ( !channels[channel] ) { channels[channel] = []; }
        channels[channel].push({
            context: this,
            callback: fn
        });
        return this;
    }

    var publish = function (channel) {
        if ( !channels[channel] ) { return false; }
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0, l = channels[channel].length; i < l; i++) {
            var subscription = channels[channel][i];
            subscription.callback.apply(subscription.context, args);
        }
        return this;
    }

    return {
        pub: publish,
        sub: subscribe,
        installTo: function(obj) {
            obj.pub = publish;
            obj.sub = subscribe;
        }
    }
})();