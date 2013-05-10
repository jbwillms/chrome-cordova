// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.alarms', function(runningInBackground) {
  it('should contain definitions', function() {
    expect(chrome.alarms).toBeDefined();
    expect(chrome.alarms.create).toBeDefined();
    expect(chrome.alarms.get).toBeDefined();
    expect(chrome.alarms.getAll).toBeDefined();
    expect(chrome.alarms.clear).toBeDefined();
    expect(chrome.alarms.clearAll).toBeDefined();
    expect(chrome.alarms.onAlarm).toBeDefined();
  });

  describe('testing create', function() {
    beforeEach(function() {
      this.addMatchers({
        toBeWithinDelta: function(expected, delta) {
          return expected - delta <= this.actual &&
                 expected + delta >= this.actual;
        }
      });
      chrome.alarms.clearAll();
    });
    afterEach(function() {
      chrome.alarms.clearAll();
    });

    itWaitsForDone('when set only', function(done) {
      chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
        expect(Date.now()).toBeWithinDelta(expectedFireTime, 10);
        expect(alarm.name).toBe('myalarm');
        expect(alarm.scheduledTime).toBe(expectedFireTime);
        expect(alarm.periodInMinutes).not.toBeDefined();
        chrome.alarms.onAlarm.removeListener(alarmHandler);
        done();
      });

      var expectedFireTime = Date.now() + 100;
      chrome.alarms.create('myalarm', { when:expectedFireTime });
    });

    itWaitsForDone('delayInMinutes set only', function(done) {
      chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
        expect(Date.now()).toBeWithinDelta(expectedFireTime, 10);
        expect(alarm.name).toBe('myalarm');
        expect(alarm.scheduledTime).toBeWithinDelta(expectedFireTime, 5);
        expect(alarm.periodInMinutes).not.toBeDefined();
        chrome.alarms.onAlarm.removeListener(alarmHandler);
        done();
      });

      var expectedFireTime = Date.now() + 60;
      chrome.alarms.create('myalarm', { delayInMinutes:0.001 });
    });

    itWaitsForDone('periodInMinutes set only', function(done) {
      var callNumber = 0;
      chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
        callNumber++;
        expect(Date.now()).toBeWithinDelta(expectedFireTime, 10);
        expect(alarm.name).toBe('myalarm');
        expect(alarm.scheduledTime).toBeWithinDelta(expectedFireTime, 5);
        expect(alarm.periodInMinutes).toBe(0.001);
        if (callNumber < 3) {
          expectedFireTime = Date.now() + 60;
        } else {
          chrome.alarms.onAlarm.removeListener(alarmHandler);
          done();
        }
      });

      var expectedFireTime = Date.now() + 60;
      chrome.alarms.create('myalarm', { periodInMinutes:0.001 });
    });

    itWaitsForDone('periodInMinutes and delayInMinutes set', function(done) {
      var callNumber = 0;
      chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
        callNumber++;
        expect(Date.now()).toBeWithinDelta(expectedFireTime, 10);
        expect(alarm.name).toBe('myalarm');
        expect(alarm.scheduledTime).toBeWithinDelta(expectedFireTime, 5);
        expect(alarm.periodInMinutes).toBe(0.001);
        if (callNumber < 3) {
          expectedFireTime = Date.now() + 60;
        } else {
          chrome.alarms.onAlarm.removeListener(alarmHandler);
          done();
        }
      });

      var expectedFireTime = Date.now() + 30;
      chrome.alarms.create('myalarm',
                           { delayInMinutes:0.0005, periodInMinutes:0.001 });
    });

    itWaitsForDone('multiple alarms', function(done) {
      var expectedAlarms = { alarm1:{ name:'alarm1', scheduledTime:Date.now() + 30 },
                             alarm2:{ name:'alarm2', scheduledTime:Date.now() + 60 },
                             alarm3:{ name:'alarm3', scheduledTime:Date.now() + 90 } };
      chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
        expect(alarm.name).toBe(expectedAlarms[alarm.name].name);
        expect(alarm.scheduledTime).toBeWithinDelta(expectedAlarms[alarm.name].scheduledTime, 5);
        expect(alarm.periodInMinutes).not.toBeDefined();
        delete expectedAlarms[alarm.name];
        if (Object.keys(expectedAlarms).length == 0) {
          chrome.alarms.onAlarm.removeListener(alarmHandler);
          done();
        }
      });

      for (var name in expectedAlarms) {
        chrome.alarms.create(name, { when:expectedAlarms[name].scheduledTime });
      }
    });
  });

  describe('testing get', function() {
    var future = Date.now() + 100000;
    var inputAlarmInfo = { alarm1:{ when:future }, alarm2:{ delayInMinutes:2 },
                           alarm3:{ periodInMinutes:3 } };
    var expectedAlarms;
    beforeEach(function() {
      chrome.alarms.clearAll();
      for (var name in inputAlarmInfo) {
        chrome.alarms.create(name, inputAlarmInfo[name]);
      }
      expectedAlarms = { alarm1:{ name:'alarm1', scheduledTime:future },
                         alarm2:{ name:'alarm2', scheduledTime:Date.now() + 120000 },
                         alarm3:{ name:'alarm3', scheduledTime:Date.now() + 180000,
                                  periodInMinutes:3 } };
      this.addMatchers({
        toMatchAlarm: function(expectedAlarm) {
          return expectedAlarm.name == this.actual.name &&
                 expectedAlarm.scheduledTime - 10 <= this.actual.scheduledTime &&
                 expectedAlarm.scheduledTime + 10 >= this.actual.scheduledTime &&
                 expectedAlarm.periodInMinutes == this.actual.periodInMinutes;
         }
      });
    });
    afterEach(function() {
      chrome.alarms.clearAll();
    });

    itWaitsForDone('get one', function(done) {
      var numCalls = 0;
      function verifyAlarm(alarm) {
        numCalls++;
        expect(alarm).toMatchAlarm(expectedAlarms[alarm.name]);
        if (numCalls >= Object.keys(expectedAlarms).length) {
          done();
        }
      }
      for (var name in inputAlarmInfo) {
        chrome.alarms.get(name, verifyAlarm);
      }
    });

    itWaitsForDone('get all', function(done) {
      chrome.alarms.getAll(function(alarms) {
        for(var i = 0; i < alarms.length; i++) {
          expect(alarms[i]).toMatchAlarm(expectedAlarms[alarms[i].name]);
        }
        done();
      });
    });
  });

  describe('testing clear', function() {
    var alarmHandler;

    beforeEach(function() {
      var inputAlarmInfo = { alarm1:{ when:Date.now() + 200 }, alarm2:{ delayInMinutes:0.0001 },
                             alarm3:{ periodInMinutes:0.0002 } };
      chrome.alarms.clearAll();
      nameSpy = jasmine.createSpy('nameSpy');
      chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
        nameSpy(alarm.name);
      });
      for (var name in inputAlarmInfo) {
        chrome.alarms.create(name, inputAlarmInfo[name]);
      }
    });
    afterEach(function() {
      chrome.alarms.onAlarm.removeListener(alarmHandler);
      chrome.alarms.clearAll();
    });

    itWaitsForDone('clear one', function(done) {
      chrome.alarms.clear('alarm3');
      setTimeout(function() {
        expect(nameSpy).toHaveBeenCalledWith('alarm1');
        expect(nameSpy).toHaveBeenCalledWith('alarm2');
        expect(nameSpy).not.toHaveBeenCalledWith('alarm3');
        done();
      }, 210);
    });

    itWaitsForDone('clear all', function(done) {
      chrome.alarms.clearAll();
      setTimeout(function() {
        expect(nameSpy).not.toHaveBeenCalled();
        done();
      }, 210);
    });
  });
});
