// @flow
import React, { Fragment, Component, PureComponent, createRef } from 'react';
import { Formik } from 'formik';
import autoscroll from 'autoscroll-react';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Dropzone from 'react-dropzone';
import { Picker } from 'emoji-mart';
import AddCircle from '@material-ui/icons/AddCircle'

import ChatBox from './ChatBox';
import ChatHeader from './ChatHeader';
import Userlist from './Userlist';
import { uploadFileAndSend } from '../utils/ipfs';

import 'emoji-mart/css/emoji-mart.css';

class WhoIsTyping extends PureComponent {

  whoIsTyping() {
    const { users, usersTyping, currentChannel } = this.props;
    const currentTime = new Date().getTime();

    const typingInChannel = usersTyping[currentChannel];
    const typingUsers = [];
    for (let pubkey in typingInChannel) {
      const lastTyped = typingInChannel[pubkey];
      if (!users[pubkey]) continue;
      if (currentTime - lastTyped > 3*1000 || currentTime < lastTyped) continue;
      typingUsers.push(users[pubkey].username)
    }
    return typingUsers;
  }

  render() {
    const userList = this.whoIsTyping();
    return (
      <div style={{ textAlign: 'center' }}>
        {!userList.length ? "" : `${userList.join(',')} is typing`}
      </div>
    )
  }
}

function onDrop(acceptedFiles, rejectedFiles, ipfs, sendMessage) {
  const file = acceptedFiles[0];
  uploadFileAndSend(ipfs, file, sendMessage);
}

const keyDownHandler = (e, typingEvent, setValue, value) => {
  if(e.shiftKey && e.keyCode === 13) {
	  e.preventDefault();
    const cursor = e.target.selectionStart;
    const newValue = `${value.slice(0, cursor)}\n${value.slice(cursor)}`;
    setValue('chatInput', newValue);
  }
  else if (e.keyCode === 13) {
    e.preventDefault();
    const form = ChatRoomForm.current;
    form.dispatchEvent(new Event("submit"));
  }
  typingEvent(e)
};

const AutoScrollList = autoscroll(List);
const formStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', flexBasis: '10%' };
const ChatRoomForm = createRef();
const NameInput = createRef();
const messagesOffset = 185;
class ChatRoom extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showEmojis: false,
      infoPanelActive: true
    };
  }

  toggleEmojis(e) {
    this.setState(({ showEmojis: !this.state.showEmojis }));
  }

  toggleInfoPanel = () => {
    this.setState({ infoPanelActive: !this.state.infoPanelActive })
  }

  uploadFileDialog() {
    this.fileInput.click();
  }

  fileChangedHandler(event) {
    const { ipfs, sendMessage } = this.props;
    const file = event.target.files[0];
    console.dir("handling file upload");
    uploadFileAndSend(ipfs, file, sendMessage);
  }

  addEmoji(emoji, chatInput, setValue) {
    console.log(emoji);
    setValue('chatInput', `${chatInput}:${emoji.id}:`);
    this.setState(({showEmojis: false}), () => {
      NameInput.current.labelNode.focus();
    });
  }

  render() {
    const { messages, sendMessage, currentChannel, usersTyping, typingEvent, channelUsers, allUsers, ipfs } = this.props;
    const { showEmojis, infoPanelActive } = this.state;
    const messagesHeight = `calc(100vh - ${messagesOffset}px)`;
    return (
      <div style={{ width: '100%', flexWrap: 'nowrap', display: 'flex', boxSizing: 'border-box' }} >
        <input
          type="file"
          ref={(input) => { this.fileInput = input; }}
          onChange={this.fileChangedHandler.bind(this)}
          style={{display: 'none'}}
        />
        <Grid xs={12} item>
          <Dropzone
            onDrop={(a, r) => {
              onDrop(a, r, ipfs, sendMessage);
            }}
            disableClick
            style={{ position: 'relative', height: '100%' }}
            activeStyle={{
              backgroundColor: 'grey',
              outline: '5px dashed lightgrey',
              alignSelf: 'center',
              outlineOffset: '-10px'
            }}>
            <Grid
              container
              direction="column"
              justify="flex-start"
              alignItems="stretch"
              style={{ height: '100%' }}
            >
              <ChatHeader currentChannel={currentChannel} toggleSidebar={this.toggleInfoPanel} />
              <Divider/>
              <Grid container wrap="nowrap">
                <Grid xs={infoPanelActive ? 9 : 12} item style={{ overflowY: 'scroll' }}>
                  <AutoScrollList style={{ height: messagesHeight, overflow: 'scroll' }}>
                    {messages[currentChannel] && messages[currentChannel].map((message) => (
                      <Fragment key={message.data.payload}>
                        <ChatBox {...message} ipfs={ipfs}/>
                        <li>
                          <Divider/>
                        </li>
                      </Fragment>
                    ))}
                  </AutoScrollList>
                  <Formik
                    initialValues={{ chatInput: '' }}
                    onSubmit={(values, { setSubmitting, resetForm }) => {
                      const { chatInput } = values;
                      sendMessage(chatInput);
                      resetForm();
                      setSubmitting(false);
                    }}
                  >
                    {({
                       values,
                       errors,
                       touched,
                       handleChange,
                       handleBlur,
                       handleSubmit,
                       setFieldValue
                    }) => (
                      <div className="chat-input">
                        <form onSubmit={handleSubmit} style={formStyle} ref={ChatRoomForm}>
                          <Button onClick={(e) => this.uploadFileDialog()}><AddCircle /></Button>
                          <TextField
                            id="chatInput"
                            ref={NameInput}
                            multiline
                            style={{ width: 'auto', flexGrow: '0.95', margin: '2px 0 0 0' }}
                            label="Type a message..."
                            type="text"
                            name="chatInput"
                            margin="normal"
                            variant="outlined"
                            fullWidth
                            onChange={handleChange}
                            onKeyDown={(e) => keyDownHandler(e, typingEvent, setFieldValue, values.chatInput)}
                            onBlur={handleBlur}
                            value={values.chatInput || ''}
                          />
                          {showEmojis && <Picker onSelect={(emoji) => this.addEmoji(emoji, values.chatInput, setFieldValue)}
                                           style={{ position: 'absolute', bottom: '80px', right: '20px' }}/>}
                          <Button onClick={(e) => this.toggleEmojis(e)}>Smile</Button>
                          {errors.chatInput && touched.chatInput && errors.chatInput}
                        </form>
                        <WhoIsTyping
                          currentChannel={currentChannel}
                          usersTyping={usersTyping}
                          users={allUsers}/>
                      </div>
                    )}
                  </Formik>
                </Grid>
                <Grid xs={infoPanelActive ? 3 : false} item style={{ overflow: 'auto', borderLeft: '1px solid lightgrey', minHeight: '100vh' }}>{infoPanelActive && <Userlist />}</Grid>
              </Grid>
            </Grid>
          </Dropzone>
        </Grid>
      </div>
    )
  }
}

export default ChatRoom;
