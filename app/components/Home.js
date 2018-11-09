// @flow
import React, { Component } from 'react';
import StatusJS from 'status-js-api';
import Grid from '@material-ui/core/Grid';
import routes from '../constants/routes';
import ChatRoom from './ChatRoom';
import { User } from '../utils/actors';


const DEFAULT_CHANNEL = "mytest";
const status = new StatusJS();
status.connect("ws://localhost:8546");

  type Props = {};

  export default class Home extends Component<Props> {
    props: Props;

    state = {
      messages: [],
      users: {},
      channels: {
        [DEFAULT_CHANNEL]: { users: {} }
      },
      currentChannel: DEFAULT_CHANNEL,
      usersTyping: {}
    };

    componentDidMount() {
      const { currentChannel } = this.state;
      status.joinChat(currentChannel, () => {
        console.log(`joined channel ${currentChannel}`);
        status.onMessage(currentChannel, (err, data) => {
          const msg = JSON.parse(data.payload)[1][0];

          if (JSON.parse(data.payload)[1][1] === 'content/json') {
            this.handleProtocolMessages(currentChannel, data);
          } else {
            //channels.addMessage(DEFAULT_CHANNEL, msg, data.data.sig, data.username)
          }
          const message = { username: data.username, message: msg, data };
          this.setState((prevState) => {
            return { messages: [ ...prevState.messages, message ] }
          })
        });
      });
    }

    sendMessage = message => {
      status.sendMessage(DEFAULT_CHANNEL, message)
    }

    addUserToChannel = (channelName, user) => {
      const { channels } = this.state;
      const channel = { ...channels[channelName] };
      channel.users[user.pubkey] = user;
      this.setState({ channels: { ...channels, [channelName]: channel }});
    }

    getChannel = channelName => {
      const { channels } = this.state;
      return channels.find(c => c.name === channelName);
    }

    handleProtocolMessages = (channelName, data) => {
      const msg = JSON.parse(JSON.parse(data.payload)[1][0]);
      const fromUser = data.data.sig;

      if (msg.type === 'ping') {
        const user = this.addOrUpdateUserKey(fromUser, data.username);
        this.addUserToChannel(channelName, user);
      }

      if (msg.type === 'typing') {
        this.setState(prevState => ({
          usersTyping: {
            ...prevState.usersTyping,
            [fromUser]: (new Date().getTime())
          }
        }))
      }
    }

    addOrUpdateUserKey = (pubkey, username) => {
      const user = new User(pubkey, username);
      user.lastSeen = (new Date().getTime());
      user.online = true;
      this.setState(prevState => ({
        users: {
          ...prevState.users,
          [pubkey]: user
        }
      }))
      return user;
    }

    render() {
      const { messages } = this.state;
      return (
        <Grid container spacing={0}>
          <Grid item xs={3}>
            <div>test</div>
          </Grid>
          <Grid item xs={9}>
            <ChatRoom messages={messages} sendMessage={this.sendMessage}/>
          </Grid>
        </Grid>
      );
    }
}
