
import  { SNSClient } from "@aws-sdk/client-sns";

import {
    SubscribeCommand, 
    UnsubscribeCommand, 
    PublishCommand,
    ListSubscriptionsByTopicCommand
} from "@aws-sdk/client-sns";

const REGION = "us-east-1";
const snsClient = new SNSClient({ region: REGION });
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:842551175243:newsletter-topic';  // a default topic

const subscribtionPath = '/subscribe';
const unsubscribtionPath = '/unsubscribe';
const publishMessagePath = '/publish';

export const handler = async (event) => {
  let payload = null;
  
  try{
      payload = JSON.parse(event.body);
  } catch(err) {
      return setResponse(401, {msg: 'Opps! Invalid payload supplied!'});
  }
  
  if(event.httpMethod === 'POST' && event.path === subscribtionPath){
    return await subscribe(payload);
  } else if( event.httpMethod === 'POST' && event.path === unsubscribtionPath ){
    return await unsubscribe(payload);
  } else if( event.httpMethod === 'POST' && event.path === publishMessagePath ){
    return await publishMessage(payload);
  }
};

async function _findSubscriptions(email) {
  try{
    const params = { TopicArn: SNS_TOPIC_ARN };
    const data = await snsClient.send(new ListSubscriptionsByTopicCommand(params));
    let subscriptions = data.Subscriptions.filter((el) => {
      return el.Endpoint === email;
    })
    return subscriptions;
  } catch(err) {
     return false;
  }
}

async function subscribe(payload) {
    const params = {
      Protocol: "email",
      TopicArn: SNS_TOPIC_ARN,
      Endpoint: payload.email    // valid email id
    };
    try {
        let checkExisingSubs = await _findSubscriptions(params.Endpoint);
        if(checkExisingSubs.length) {
          return setResponse(200, checkExisingSubs[0]);
        }
        let data = await snsClient.send(new SubscribeCommand(params));
        return setResponse(200, data);
    } catch (err) {
        return setResponse(403, err);
    }
};

async function unsubscribe(payload) {
    let params = {
      Protocol: "email",
      TopicArn: SNS_TOPIC_ARN,
      Endpoint: payload.email    // valid email id
    };
    try {
      let checkExisingSubs = await _findSubscriptions(params.Endpoint);
      if(!checkExisingSubs.length) return setResponse(200, checkExisingSubs);
      params = {
        SubscriptionArn: checkExisingSubs[0]['SubscriptionArn']
      };
      let data = await snsClient.send(new UnsubscribeCommand(params));
      return setResponse(200, data);
    } catch (err) {
        return setResponse(403, err);
    }
};

async function publishMessage(payload) {
    var params = {
      Message: payload.message.trim(),
      TopicArn: SNS_TOPIC_ARN
    };
    try {
        const data = await snsClient.send(new PublishCommand(params));
        return setResponse(200, data);
    } catch (err) {
        return setResponse(403, err);
    }
};

function setResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }
};