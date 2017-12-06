import React, { Component } from 'react';
import { connect } from 'react-redux';
// import TimerMixin from 'react-timer-mixin';
// import reactMixin from 'react-mixin';
import { componentToHex, rgbToHex, mulColor, genColor, formatTime, MiniDaemon } from './common'

// Action Creators

const taskComplete = (id) => {
    return {
        type: "COMPLETE",
        id: id,
    }
}

const taskStart = (id) => {
    return {
        type: "START_NORMAL",
        id: id,
    }
}

const taskStop = (id) => {
    return {
        type: "STOP",
        id: id,
    }
}

const taskResetClient = (id) => {
    return {
        type: "RESET",
        id: id,
    }
}

const taskReset = (id) => {
    return (dispatch) => {
        const reqInit = { method: "POST" }
        return fetch("/api/task/"+id+"/reset", reqInit)
            .then(response => {
                if(response.ok) {
                    dispatch(taskResetClient(id))
                } else {
                    
                }
            })
    }
}


const taskSyncClient = (id, newTime, newStartTime) => {
    return {
        type: "SYNC",
        id: id,
        newTime: newTime,
        newStartTime: newStartTime
    }
}

const taskSync = (id, newTime) => {
    return (dispatch) => {
        const data = new FormData();
        data.append( "new_time", newTime )
        const reqInit = { method: "POST", body: data }
        return fetch("/api/task/"+id+"/sync", reqInit)
            .then(response => {
                if(response.ok) {
                    dispatch(taskSyncClient(id, newTime))
                } else {
                    dispatch(taskSyncClient(id, newTime))
                }
            })
    }
}

const pomoStart = (id) => {
    return {
        type: "START_POMO",
        id: id,
    }
}

const pomoStopClient = (id) => {
    return {
        type: "STOP_POMO",
        id: id,
    }
}

const pomoCompleteAndBreak = (id) => {
    return (dispatch) => {
        const reqInit = { method: "POST" }
        return fetch("/api/task/"+id+"/pomo_complete", reqInit)
            .then(response => {
                if(response.ok) {
                    dispatch(pomoStopClient(id))
                } else {
                    dispatch(pomoStopClient(id))
                }
            })
    }
}


// Components

var colors = {
    BREAK: genColor("8888FF"),
    ACTIVE: genColor("33BB33"),
    INACTIVE: genColor("995555"),
    COMPLETE: genColor("005500"),
    POMO: genColor("d16a1e")
}

class Pomodoro extends Component {
    constructor(props) {
        super(props);
        this.dispatch = props.dispatch
        this.pomoDuration = props.pomoDuration
        this.pomoStartTime = props.pomoStartTime
        this.pomoStatus = props.pomoStatus
        this.id = props.id
        this.state = {
            pomoProgress: 0,
            pomoRemains: 0
        }
    }

    componentWillMount() {
        this.pomoTimer = new MiniDaemon(null, this.update.bind(this),50, Infinity)
        this.pomoTimer.pause()
    }

    componentWillUnmount() {
        this.pomoTimer.pause()
    }

    update() {
        var now = Date.now()
        var elapsed = (now - this.pomoStartTime ) / 1000
        var p = elapsed / this.pomoDuration
        var remains = this.pomoDuration - elapsed
        if (remains <= 0) remains = 0;


        // var rmins = Math.ceil(remains/60)
        // if ((rmins % 5 == 0) && (rmins != this._prevSoundTime) && elapsed > 60){
        //     if (rmins == 0) {
        //         audioElement.setAttribute('src', '/static/DevotionAura.ogg');
        //     } else {
        //         audioElement.setAttribute('src', '/static/Deathknight_PlagueStrike2.ogg');
        //     }
            
        //     audioElement.play()
        //     this._prevSoundTime = rmins
        // }
        if (p>=1) {
            p = 1
            elapsed = this.pomoDuration

            // this.pomoTimer.pause()
            // if (this.pomoState == "BREAK" || this.pomoState == "LONGBREAK"){
            //     audioElement.setAttribute('src', '/static/ConcussiveShotImpact.ogg');
            //     audioElement.play()
            //     this.stop_break()
            // } else if (this.pomoState == "ACTIVE") {
            //     this.updateServer("add_time", this.pomoLength)
            //     this.taskTime = this.taskTime + this.pomoLength
            //     this._update(true, true)
            //     this.start_break()
            // }
        }
        this.setState({
            pomoProgress: p,
            pomoRemains: remains
        })

        if ( p === 1) {
            this.dispatch(pomoCompleteAndBreak(this.id))
        }
    }

    render() {
        const { pomoStatus, pomoStartTime, pomoDuration } = this.props
        const { pomoProgress, pomoRemains } = this.state

        this.pomoStartTime = pomoStartTime
        this.pomoDuration = pomoDuration
        this.pomoStatus = pomoStatus

        const color = (pomoStatus === "ACTIVE") ? colors.ACTIVE[0] : colors.BREAK[0]

        if (pomoStatus === "ACTIVE" || pomoStatus === "BREAK"){
            this.pomoTimer.resume()
        } else {
            this.pomoTimer.pause()
        }

        return (
            <div className="clock">
                <svg viewBox="0 0 100 100">
                    <path d="M 50,50 m 0,-46.5 a 46.5,46.5 0 1 1 0,93 a 46.5,46.5 0 1 1 0,-93" stroke="#222222" strokeWidth="1" fillOpacity="0"></path>
                    <path d="M 50,50 m 0,-46.5 a 46.5,46.5 0 1 1 0,93 a 46.5,46.5 0 1 1 0,-93" stroke={ color } strokeWidth="7" fillOpacity="0" strokeDasharray="292.209, 292.209" strokeDashoffset={ 292.209 - 292.209*pomoProgress }></path>
                </svg>
                <span>{ formatTime(pomoRemains) }</span>
            </div>
        )
    }
}
// reactMixin(Pomodoro.prototype, TimerMixin);

class Task extends Component {
    constructor(props) {
        super(props);
        // If you don't use it in render(), it shouldn't be in the state.
        // For example, you can put timer IDs directly on the instance.
        this.dispatch = props.dispatch
        this.startTime = props.taskStartTime
        // this.taskLastSync = 
        this.taskTimeCompleted = props.taskTimeCompleted //value that is saved on server
        this.taskLength = props.taskLength
        this.taskSyncPeriod = 1*60
        this.id = props.id
        this.state = {
            unsyncedProgress: 0,
            // barColor: colors.incomplete
        }
    }

    componentWillMount() {
        this.normalTimer = new MiniDaemon(null, this.update.bind(this),50, Infinity)
        this.normalTimer.pause();
    }

    componentWillUnmount() {
        this.normalTimer.pause();
    }

    update() {
        const now = Date.now()
        // console.log("this = ", this)
        let elapsed = (now - this.startTime ) / 1000
        if (this.startTime === undefined) elapsed = 0;
        let p = (elapsed + this.taskTimeCompleted) / this.taskLength
        // console.log(this.taskId, this.taskStartTime, elapsed, this.taskTime, elapsed + this.taskTime, this.taskLength)
        let remains = this.taskLength - elapsed
        if (remains <= 0) remains = 0;
        if (p>=1) {
            p = 1;

            return this.dispatch(taskComplete(this.id))
        } else if (elapsed > this.taskSyncPeriod) {
            this.startTime += this.taskSyncPeriod*1000
            this.setState({ unsyncedProgress: elapsed - this.taskSyncPeriod })
            this.dispatch(taskSync(this.id, this.taskTimeCompleted + this.taskSyncPeriod))
        } else {
            this.setState({ unsyncedProgress: elapsed })
        }

        // this.warning_check()
    }

    render() {
        const { id, title, taskStatus, pomoStatus, ...props } = this.props
        
        this.startTime = props.taskStartTime
        this.taskTimeCompleted = props.taskTimeCompleted

        let progress = (this.taskTimeCompleted + this.state.unsyncedProgress) / props.taskLength
        if (progress > 1) progress = 1

        const color = colors[taskStatus]

        if (taskStatus === "ACTIVE"){
            this.normalTimer.resume()
        } else {
            this.normalTimer.pause()
        }

        // var length = this._path.getTotalLength();
        // this._path.style.strokeDasharray = length + ' ' + length;
        // this._path.style.strokeDashoffset = length;
        // so dasharray is path length
        return (
            <div id="task{ id }" className="task">
                <div className="pbcont">
                    <div><span className="title">{ title }</span><span className="duration"></span></div>
                    <div className="progressbar">
                        <svg viewBox="0 0 100 6.7" preserveAspectRatio="none">
                            <path d="M 0,3.35 L 100,3.35" stroke={color[1]} strokeWidth="6.7" fillOpacity="0"></path>
                            <path d="M 0,3.35 L 100,3.35" stroke={color[0]} strokeWidth="6.7" strokeDasharray="100, 100" strokeDashoffset={ 100 - 100*progress } fillOpacity="0"></path>
                        </svg>
                    </div>
                    <a src="" className="reset" onClick={ props.onTaskReset }><span>Reset</span></a>
                    { ((taskStatus !== "COMPLETE") && (pomoStatus !== "ACTIVE") && (taskStatus !== "ACTIVE")) && <a src="" className="start" onClick={ props.onTaskStart }><span>Start</span></a> }
                    { (taskStatus !== "COMPLETE") && <a src="" className="stop" onClick={ props.onTaskStop }><span>Stop</span></a> }
                    { ((taskStatus !== "COMPLETE") && (pomoStatus !== "ACTIVE") && (taskStatus !== "ACTIVE")) && <a src="" className="pomo" onClick={ props.onPomoStart }><span>Pomodoro</span></a> } 
                </div>
                { (pomoStatus === "ACTIVE" || pomoStatus === "BREAK") &&
                    <Pomodoro {...this.props}/>
                }
                <div className="1warning">
                </div>
            </div>
        )
    }
}
// reactMixin(Task.prototype, TimerMixin);


// Connecting

const mapStateToProps = (state, props) => {
    return {
        // state: state
    }
}


const mapDispatchToProps = (dispatch, props) => {
    return {
        dispatch: dispatch,
        onTaskStart: () => {
            dispatch(taskStart(props.id))
        },

        onTaskStop: () => {
            dispatch(taskStop(props.id))
        },
        onTaskReset: () => {
            dispatch(taskReset(props.id))
        },

        onPomoStart: () => {
            dispatch(pomoStart(props.id))
        },
        // // onEditSubmit: (newText) => {
        //     dispatch(postSave(props.id, newText))
        // },

        // onEditCancel: (newText) => {
        //     dispatch(postEditCancel(props.id))
        // },

        // onDelete: () => {
        //     dispatch(postDelete(props.id))
        // },
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Task)

