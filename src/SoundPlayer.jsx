import React, { Component } from 'react';
import { connect } from 'react-redux';


const initialState = {
    url: "/static/train.mp3",
    status: "STOPPED"
};

const soundReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SOUND_PLAY': {
            return Object.assign({}, state, { status: "PLAYING" });
        }

        case 'SOUND_STOP': {
            return Object.assign({}, state, { status: "STOPPED" });
        }

        default:
            return state
    }
}




class SoundPlayer extends Component {
    render() {
        const { url, status } = this.props.sound
        const isPlaying = (status === "PLAYING")
        if (isPlaying) {
            return <audio ref={(audio) => { this.audioElement = audio }} src={url} autoPlay />
        } else {
            return <div/>
        }          
    }
}


const mapStateToProps = (state, props) => {
    return {
        sound: state.sound
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        dispatch,

        // onAddClick: (title) => {
            // dispatch(todoAdd(title))
        // }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(SoundPlayer)
export { soundReducer }
