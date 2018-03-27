import React, { Component } from 'react';
import { connect } from 'react-redux';
import { mulColor, formatTime2, MiniDaemon } from './common'

const rowHeight = 23

const postAdd = () => {
    return {
        type: 'ADD'
    }
}

// Reducer

const scheduleReducer = (state = {}, action) => {
    switch (action.type) {
        case 'INIT': {
            return action.newState
        }
        case 'ADD':  {
            for (const post of state) {
                if (post.id === null)
                    return state;
            }
            return [
                {
                    id: null,
                    text: "",
                    isEditing: true,
                    created_date: Date.now()
                },
                ...state
            ]
        }
        case 'ADD_CONFIRM':{
            return state.map(post => {
                if (post.id === null)
                    return Object.assign({}, post,
                        {
                            id: action.data.id,
                            isEditing: false,
                            text: action.data.text,
                            created_date: new Date(action.data.created_date)
                        });
                else return post
                })
        }
        case 'EDIT_CANCEL':{
            if (action.id === null)
                return state.filter(post => {
                    return post.id != null;
                })
            else
                return state.map(post => {
                    if (post.id === action.id)
                        return Object.assign({}, post, { isEditing: false });
                    else return post
                    })
        }
        case 'EDIT': {
            return state.map(post => {
                if (post.id === action.id)
                    return Object.assign({}, post, { isEditing: true });
                else return post
                })
        }
        case 'SAVE': {
            return state.map(post => {
                if (post.id === action.id)
                    return Object.assign({}, post, { isEditing: false, text: action.newText });
                else return post
                })
        }
        case 'DELETE': {
            return state.filter(post => {
                    return post.id !== action.id;
                })
        }

        default: return state || [];
    }
}



const ScheduleRow = ({index, timestring}) => {
    const style = {
        position: "absolute",
        left: -45,
        top: rowHeight*index,
        height: rowHeight,
        width: "205px",
        borderBottomStyle: "solid",
        borderBottomWidth: "1px",
        borderBottomColor: "#111111",
        paddingLeft: 2,
        paddingTop: 9,
        color: "#333333"
    }
    return (
        <div style={style}>
            {timestring && <div style={{ width: 30, fontSize: 11, textAlign: "right" }}>{timestring}</div>}
        </div>
    )
}



// const TaskField = ({ startTime, duration, color }) => {
//     console.log("starttime duration", startTime, duration)
//     const width = 160
//     const height = duration*rowHeight
//     const title = "Some Job"
//     const style = {
//         position: "absolute",
//         left: 0,
//         top: rowHeight*startTime,
//         height: height,
//         width: width,
//         // opacity: 0.1,
//         backgroundColor: color,
//         // backgroundImage: 'url("/static/shieldtex.png")',
//         // borderLeftWidth: "3px",
//         // borderLeftStyle: "solid",
//         // borderLeftColor: "#22cc22"
//     }
//     return (
//         <div style={style}>
//             <svg width={ width } height={ height } viewBox={[0, 0, width, height]}>
        
//                 <defs>
//                     <pattern id="hatchPattern" patternTransform="rotate(45 0 0)" width="4" height="4"
//                         patternUnits="userSpaceOnUse">
//                         <line x1={0} y1={0} x2={0} y2={20} style={{ stroke: "#000000", strokeWidth:5 }} />
//                     </pattern>
//                 </defs>
                
//                 <rect width={width} height={height} fill="url(#hatchPattern)"/>
//                 <line x1="0" y="0" x2="0" y2={height} style={{ stroke: color, strokeWidth:15 }} />
//             </svg>
//             {/* <span style={{ padding: 5, backgroundColor: color, position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>{title}</span> */}
//         </div>
//     )
// }

const TaskFieldAlt = ({ startTime, duration, color, title }) => {
    const startHours = startTime / 1800
    const durationHours = duration / 1800

    const width = 160
    const height = durationHours*rowHeight
    const style = {
        position: "absolute",
        left: 0,
        top: rowHeight*startHours,
        height: height,
        width: width,
        // opacity: 0.1,
        backgroundColor: mulColor(color, 0.4),
        borderTopWidth: "2px",
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderStyle: "solid",
        borderColor: color,
    }

    return (
        <div style={style}>
            <svg width={ width } height={ height } viewBox={[0, 0, width, height]}>
        
                <defs>
                    <pattern id="hatchPattern" patternTransform="rotate(45 0 0)" width="4" height="4"
                        patternUnits="userSpaceOnUse">
                        <line x1={0} y1={0} x2={0} y2={20} style={{ stroke: "#000000", strokeWidth:5 }} />
                    </pattern>
                </defs>
                
                <rect width={width} height={height-3} fill="url(#hatchPattern)"/>
            </svg>
            <span style={{ padding: 5, color: color, textAlign: "center", fontWeight: "bold", width: "100%", position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>{title}</span>
        </div>
    )
}

// Components

class Timeline extends Component {
    constructor(props) {
        super(props);
        this.barStyle = {
            position: "absolute",
            left: -11,
            width: 10,
            height: "100%",
            // borderRadius: 3,
            backgroundColor: "#090909",
            paddingLeft: 3,
            paddingRight: 3
        }
        this.bgStyle = {
            height: "100%",
            width: "100%",
            // borderRadius: "3px",
            background: mulColor("#8b4ee6",0.33),
            position: "relative"
        }
        this.fgStyle = {
            top: 0,
            left: 0,
            // height: progress+"%",
            width: "100%",
            // borderRadius: "3px",
            background: "#8b4ee6",
            position: "absolute",
            bottom: "0px"
        }
        this.state = {
            progress: 0.4,
        }
    }

    componentWillMount() {
        this.timer = new MiniDaemon(null, this.update.bind(this), 1000, Infinity)
        this.timer.start()
    }

    componentWillUnmount() {
        this.timer.pause()
    }

    update() {
        let dayStart = new Date()
        dayStart.setHours(7)
        dayStart.setMinutes(0)
        dayStart.setSeconds(0)

        const date = new Date()
        if (date.getHours() < 7) {
            dayStart -= 24*3600*1000
        }
        const delta = (date - dayStart)/1000

        const dayDuration = 19.5*3600

        let p = delta/dayDuration
        
        if (p>=1) {
            p = 1
        }
        p = p * 100
        this.setState({
            progress: p,
        })
    }

    render() {
        const { progress } = this.state
        const style = Object.assign({}, this.fgStyle, { height: progress+"%" })
        
        return (
            <div className="bar" style={this.barStyle}>
                <div draggable="true" className="background" style={this.bgStyle} >
                    <div className="value" style={style}>
                    </div>
                </div>
            </div>
        )
    }
}

const lines = [...Array(39).keys()]
const Schedule = ({ tasks }) => {
    const dayStart = 7*3600
    const blockStyle = {
        // borderLeftStyle: "solid",
        // borderLeftWidth: "1px",
        // borderLeftColor: "#444444",
        width: "150px",
        height: rowHeight*39,
        position: "relative"
    }
    return (
        // style={{ position: "absolute", left: 100, top: 20 }}
        <div className="col-xs-12 col-sm-4">
            <div style={ blockStyle }>
                
                {lines.map(index =>
                    <ScheduleRow key={index} index={ index } timestring={ (!(index % 1)) ? formatTime2(dayStart+((index+1)*1800)) : null}/>
                )}

                <Timeline progress={40} />
                {tasks.map(task =>
                    <TaskFieldAlt key={task.id} startTime={task.suggestedStartTime} duration={task.taskLength} title={task.title} color={task.color} />
                )}
            </div>
        </div>
    )
}

// Connecting

const mapStateToProps = (state, props) => {
    return {
        tasks: state.tasks
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        onAddClick: () => {
            dispatch(postAdd())
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Schedule)
export { scheduleReducer }