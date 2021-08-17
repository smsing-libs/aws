var aws = require('aws-sdk');

function createLib(execlib, messengerbaselib){
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    SMSerBase = messengerbaselib.MessengerBase,
    analyzeBounce = null, //require('./bounceanalyzercreator')(execlib),
    analyzeComplaint = null; //require('./complaintanalyzercreator')(execlib);

  function AWSSMSer(config){
    SMSerBase.call(this, config);
    this.sender = new aws.SNS({
			apiVersion: config.apiVersion || '2010-03-31',
      region: config.region || 'us-east-1'
    });
    if (config.starteddefer) {
      config.starteddefer.resolve(this);
    }
  }
  lib.inherit(AWSSMSer, SMSerBase);
  AWSSMSer.prototype.destroy = function(){
    this.sender = null;
    SMSerBase.prototype.destroy.call(this);
  };

  AWSSMSer.prototype.commitSingleMessage = function(params){
    var sendObj = {};
    if (!this.sender){
      console.log('SMS sender is already destroyed');
      return q(false);
    }
    sendObj.PhoneNumber = params.to;
    sendObj.Message = params.html || params.text;

    //console.log('oli sendSMS?', require('util').inspect(sendObj, {depth: 8, colors:true}));
    return this.sender.publish(sendObj).promise();
  };

  AWSSMSer.prototype.messageIdFromCommitResponse = function (sendingsystemresponse) {
    return sendingsystemresponse.MessageId;
  };
  AWSSMSer.prototype.paramsFromDeliveryNotification = function (sendingsystemdeliverynotification) {
    if (!sendingsystemdeliverynotification) {
      throw new lib.Error('NO_DELIVERY_NOTIFICATION', 'No delivery notification provided');
    }
    if ('Delivery' !== sendingsystemdeliverynotification.notificationType) {
      throw new lib.Error('WRONG_NOTIFICATION_TYPE', sendingsystemdeliverynotification.notificationType+ ' <> Delivery');
    }
    return {
      sendingsystemid: sendingsystemdeliverynotification.mail.messageId,
      sendingsystemnotified: new Date(sendingsystemdeliverynotification.delivery.timestamp).valueOf()
    };
  };
  AWSSMSer.prototype.paramsFromBounceNotification = function (sendingsystembouncenotification) {
    return analyzeBounce(sendingsystembouncenotification, this);
  };
  AWSSMSer.prototype.paramsFromComplaintNotification = function (sendingsystemcomplaintnotification) {
    return analyzeComplaint(sendingsystemcomplaintnotification);
  };
  AWSSMSer.prototype.sendingsystemcode = 'aws';
  AWSSMSer.addMethodsToNotifier = function (klass) {
    SMSerBase.addMethodsToNotifier(klass, AWSSMSer);
  };

  return {
    mailer: AWSSMSer
  }
}

module.exports = createLib;
