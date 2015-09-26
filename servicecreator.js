function createSinkExposerService(execlib, ParentServicePack) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    registry = execSuite.registry,
    ParentService = ParentServicePack.Service;

  function factoryCreator(parentFactory) {
    return {
      'service': require('./users/serviceusercreator')(execlib, parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib, parentFactory.get('user')) 
    };
  }

  function SinkExposerService(prophash) {
    ParentService.call(this, prophash);
    this.outerSinkDestroyedListener = null;
    this.waitingIdentities = [];
    this.obtainOuterSink();
  }
  
  ParentService.inherit(SinkExposerService, factoryCreator);
  
  SinkExposerService.prototype.__cleanUp = function() {
    var outerSink = this.state.get('outerSink');
    if (this.outerSinkDestroyedListener) {
      this.outerSinkDestroyedListener.destroy();
    }
    if (outerSink) {
      this.state.remove('outerSink');
      outerSink.destroy();
    }
    ParentService.prototype.__cleanUp.call(this);
  };

  SinkExposerService.prototype.setOuterSink = function (sink) {
    if (this.outerSinkDestroyedListener) {
      this.outerSinkDestroyedListener.destroy();
    }
    if (!sink) {
      this.state.remove('outerSink');
      //destroy all non-service role users?
      return;
    }
    this.state.set('outerSink', sink);
    this.outerSinkDestroyedListener = sink.destroyed.attach(this.obtainOuterSink.bind(this));
    registry.register(sink.modulename).then(
      this.onServicePack.bind(this, sink),
      this.close.bind(this)
    );
  };
  SinkExposerService.prototype.onServicePack = function (sink, servicepack) {
    var role = sink.role,
      userctor = servicepack.Service.prototype.userFactory.get(role);
    this.userFactory.replace(role,userctor);
    //dangerous? alternative solution: introduce getModuleName method on the Service class and adjust all other software to use it
    this.modulename = sink.modulename;
    //TODO: now handle all the waiting logins etc
    //console.log('outerSink set, now comes maintenance', sink.role, sink.modulename, sink.clientuser.__methodDescriptors);
    while (this.waitingIdentities.length) {
      var wi = this.waitingIdentities.shift();
      wi[1].resolve(this.introduceUser(wi[0])); //the problem here is I need to be 100% sure that introduceUser will _not_ return a promise.
    }
    sink.consumeOOB(this);
  };

  SinkExposerService.prototype.introduceUser = function (userhash) {
    if (!this.state.get('outerSink')) {
      var d = q.defer();
      this.waitingIdentities.push([userhash,d]);
      return d.promise;
    }
    return ParentService.prototype.introduceUser.call(this, userhash);
  };

  var _have = 'have';

  SinkExposerService.prototype.onOOBData = function (item) {
    //console.log('outerSink oob item', item);
    if (item && item[1] === 's') {
      if(item[2] && item[2].p && item[2].p.length && item[2].p[0].indexOf(_have) === 0) {
        if (item[2].d) {
          //haveXXX items should not be blindly copied, 
          //but appropriate subServices should be set instead
          this.exposeSubSink(item[2].p[0].substr(_have.length)); 
        } else {
          this._onStaticallyStartedSubServiceDown(item[2].p[0].substr(_have.length));
        }
      } else {
        this.state.onStream(item);
      }
    }
  };

  SinkExposerService.prototype.exposeSubSink = execSuite.dependentServiceMethod([],['outerSink'], function (outerSink, subsinkname) {
    outerSink.subConnect(subsinkname,{name: 'user'}, {}).then(
      this._activateStaticSubService.bind(this, subsinkname),
      console.error.bind(console, subsinkname, 'nok')
    );
  });

  return SinkExposerService;
}

module.exports = createSinkExposerService;
