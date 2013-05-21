// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var exports = module.exports;
var alarms = new Object();

function Alarm(name, scheduledTime, periodInMinutes, timeoutId) {
    this.name = name;
    this.scheduledTime = scheduledTime;
    if (periodInMinutes) {
      this.periodInMinutes = periodInMinutes;
    }
    this.timeoutId = timeoutId;
}

function triggerAlarm(name) {
    if (!(name in alarms)) {
        return;
    }
    exports.onAlarm.fire(alarms[name]);
    if (alarms[name].periodInMinutes) {
        alarms[name].scheduledTime =
            Date.now() + alarms[name].periodInMinutes*60000;
        alarms[name].timeoutId = setTimeout(function() { triggerAlarm(name) },
                                            alarms[name].periodInMinutes*60000);
    } else {
        delete alarms[name];
    }
}

exports.create = function(name, alarmInfo) {
    if (typeof alarmInfo == 'undefined') {
        alarmInfo = name;
        name = '';
    }
    if (name in alarms) {
        exports.clear(name);
    }
    var delayInMinutes;
    if ('when' in alarmInfo) {
        delayInMinutes = (alarmInfo.when - Date.now())/60000;
        if ('delayInMinutes' in alarmInfo) {
            throw 'Error during alarms.create: Cannot set both when and delayInMinutes.';
        }
    } else if ('delayInMinutes' in alarmInfo) {
        delayInMinutes = alarmInfo.delayInMinutes;
    } else if ('periodInMinutes' in alarmInfo) {
        delayInMinutes = alarmInfo.periodInMinutes;
    } else {
        throw 'Error during alarms.create: Must set at least one of when, delayInMinutes, or periodInMinutes';
    }
    var periodInMinutes = ('periodInMinutes' in alarmInfo)? alarmInfo.periodInMinutes : null;

    var timeoutId =
        setTimeout(function() { triggerAlarm(name) }, delayInMinutes*60000);
    alarms[name] = new Alarm(name, Date.now() + delayInMinutes*60000,
                             periodInMinutes, timeoutId);
}

exports.get = function(name, callback) {
    if (typeof callback == 'undefined') {
        callback = name;
        name = '';
    }
    callback(alarms[name]);
}

exports.getAll = function(callback) {
    var ret = new Array();
    for (var name in alarms) {
        ret.push(alarms[name]);
    }
    callback(ret);
}

exports.clear = function clear(name) {
    if (typeof name == 'undefined') {
        name = '';
    }
    clearTimeout(alarms[name].timeoutId);
    delete alarms[name];
}

exports.clearAll = function() {
    for (var name in alarms) {
        exports.clear(name);
    }
}

var Event = require('chrome.common.events');
if (Event) {
    exports.onAlarm = new Event('onAlarm');
}
