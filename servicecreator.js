function createSinkExposerService(execlib, ParentService) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    execSuite = execlib.execSuite,
    registry = execSuite.registry,
    stubUserCreator = require('./stubusercreatorcreator')(execlib);

  function factoryCreator(parentFactory) {
    return {
      'service': require('./users/serviceusercreator')(execlib, parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib, parentFactory.get('user')) 
    };
  }

  function copier(newfactory, item, itemname) {
    newfactory.add(itemname, lib.functionCopy(item));
  }
  function SinkExposerService(prophash) {
    ParentService.call(this, prophash);
    this.originalFactory = this.userFactory;
    this.userFactory = new lib.Map();
    this.originalFactory.traverse(copier.bind(null, this.userFactory));
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
    this.userFactory.destroy();
    this.userFactory = null;
    this.originalFactory = null;
    ParentService.prototype.__cleanUp.call(this);
  };

  SinkExposerService.prototype.setOuterSink = function (sink) {
    if (!this.destroyed) {
      return;
    }
    if (this.outerSinkDestroyedListener) {
      this.outerSinkDestroyedListener.destroy();
    }
    if (!sink) {
      this.state.remove('outerSink');
      //destroy all non-service role users?
      return;
    }
    this.outerSinkDestroyedListener = sink.destroyed.attach(this.onOuterSinkDown.bind(this));
    registry.registerServerSide(sink.modulename).then(
      this.onService.bind(this, sink),
      this.close.bind(this)
    );
  };
  SinkExposerService.prototype.setUserRoleCtor = function(sink, userctor, role) {
    this.userFactory.replace(role,stubUserCreator(this.originalFactory.get(role)||this.originalFactory.get('user'), userctor, sink));
  };
  SinkExposerService.prototype.onOuterSinkDown = function () {
    this.state.remove('outerSink');
    this.obtainOuterSink();
  };
  SinkExposerService.prototype.onService = function (sink, service) {
    try {
    service.prototype.userFactory.traverse(this.setUserRoleCtor.bind(this, sink));
    this.finalizeSetOuterSink(sink);
    } catch (e) {
      console.error(e.stack);
      console.error(e);
    }
    //dangerous? alternative solution: introduce getModuleName method on the Service class and adjust all other software to use it
    //console.log(process.pid, this.subSinkName ? this.subSinkName : '', 'mutating from', this.modulename, 'to', sink.modulename);
    this.modulename = sink.modulename;
    //TODO: now handle all the waiting logins etc
    //console.log('outerSink set, now comes maintenance', sink.role, sink.modulename, sink.clientuser.__methodDescriptors);
    while (this.waitingIdentities.length) {
      var wi = this.waitingIdentities.shift();
      wi[1].resolve(this.introduceUser(wi[0])); //the problem here is I need to be 100% sure that introduceUser will _not_ return a promise.
    }
    sink.consumeOOB(this);
  };
  SinkExposerService.prototype.finalizeSetOuterSink = function (sink) {
    this.state.set('outerSink', sink);
  };

  SinkExposerService.prototype.introduceUser = function (userhash) {
    //console.log(this.subSinkName, 'introduceUser',this.state.get('outerSink') ? 'with' : 'without', 'outerSink');
    if (!this.state) {
      return null;
    }
    if (!this.state.get('outerSink')) {
      var d = q.defer();
      this.waitingIdentities.push([userhash,d]);
      return d.promise;
    }
    return ParentService.prototype.introduceUser.call(this, userhash);
  };

  var _have = 'have';

  SinkExposerService.prototype.onOOBData = function (item) {
    var subservicename, subservicesink, oobchannel, oobdata;
    if (!this.state) {
      return;
    }
    if (!item) {
      return;
    }
    if (item[1] === 's') {
      if(item[2] && item[2].p && item[2].p.length && item[2].p[0].indexOf(_have) === 0) {
        subservicename = item[2].p[0].substr(_have.length);
        if (item[2].d) {
          //haveXXX items should not be blindly copied, 
          //but appropriate subServices should be set instead
          //console.log(process.pid, 'going to exposeSubSink', subservicename);
          this.exposeSubSink(subservicename); 
        }/* else {
          subservicesink = this.subservices.get(subservicename);
          if (subservicesink) {
            //console.log(process.pid, 'going to kill exposed SubSink', subservicename);
            subservicesink.destroy();
            //this._onStaticallyStartedSubServiceDown(subservicename);
          }
        } */ //no else, subsinkexposer will take care of itself
      } else {
        this.state.onStream(item[2]);
      }
    } else {
      oobchannel = item[1];
      oobdata = item[2];
      this.users.traverse((user) => {
        if (user.role !== 'user') {
          return;
        }
        user.sessions.traverse((session) => {
          session.sendOOB(oobchannel, oobdata);
        });
      });
      oobchannel = null;
      oobdata = null;
    }
  };

  SinkExposerService.prototype.exposeSubSink = execSuite.dependentServiceMethod([],['outerSink'], function (outerSink, subsinkname) {
    this.startSubServiceStatically('allex_subsinkexposerservice', subsinkname, {parentsink: outerSink, subsinkname: subsinkname});
  });

  SinkExposerService.prototype.doForward = execSuite.dependentServiceMethod([], ['outerSink'], function (outerSink, sinkmethod, args, defer) {
    //console.log('will forwardMethod', args, defer);
    if (!(args && args.length)) {
      console.error('NO_ARGUMENTS_PROVIDED for forwardMethod');
      return q.reject(new lib.Error('NO_ARGUMENTS_PROVIDED'));
    }
    if (!defer) {
      console.error('ARGUMENTS_LENGTH_MISMATCH for', (args && args.length) ? args[0] : args);
      return q.reject(new lib.Error('ARGUMENTS_LENGTH_MISMATCH'));
    }
    if (!q.isPromise(defer.promise)){
      console.error('ARGUMENTS_LENGTH_MISMATCH for', (args && args.length) ? args[0] : args);
      return q.reject(new lib.Error('ARGUMENTS_LENGTH_MISMATCH'));
    }
    qlib.promise2defer(outerSink[sinkmethod].apply(outerSink, args), defer);
  });

  SinkExposerService.prototype.forwardMethod = function (args, defer) {
    return this.doForward('call', args, defer);
  };

  SinkExposerService.prototype.forwardSessionMethod = function (args, defer) {
    return this.doForward('sessionCall', args, defer);
  };

  return SinkExposerService;
}

module.exports = createSinkExposerService;
