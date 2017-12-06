import React, { Component } from 'react';
import { connect } from 'react-redux';
import Task from './Task'

// Reducer

const taskReducer = (state = [], action) => {
    switch (action.type) {
        case 'INIT': {
            return action.newState
        }

        case 'COMPLETE': {
            return state.map(task => {
                if (task.id === action.id)
                    return Object.assign({}, task, {
                            taskStatus: "COMPLETE",
                            taskTimeCompleted: task.taskLength
                        });
                else return task
                })
        }

        case 'START_NORMAL': {
            return state.map(task => {
                if (task.id === action.id)
                    return {
                        ...task,
                        taskStatus: "ACTIVE",
                        pomoStatus: "INACTIVE",
                        taskStartTime: Date.now(),
                        taskLastSync: Date.now()
                    }
                else return task
                })
        }

        case 'STOP': {
            return state.map(task => {
                if (task.id === action.id)
                    return Object.assign({}, task, {
                        taskStatus: "INACTIVE",
                        pomoStatus: "INACTIVE",
                    });
                else return task
                })
        }

        case 'RESET': {
            return state.map(task => {
                if (task.id === action.id)
                    return Object.assign({}, task, {
                        taskStatus: "INACTIVE",
                        pomoStatus: "INACTIVE",
                        taskTimeCompleted: 0,
                    });
                else return task
                })
        }

        case 'SYNC': {
            return state.map(task => {
                if (task.id === action.id)
                    return Object.assign({}, task, {
                        taskTimeCompleted: action.newTime,
                        taskStartTime: action.newStartTime
                    });
                else return task
                })
        }

        case 'STOP_POMO': {
            return state.map(task => {
                if (task.id === action.id) {
                    if (task.pomoStatus === "ACTIVE") {
                        let newTime = task.taskTimeCompleted + task.pomoLength
                        let newStatus = "INACTIVE"
                        if (newTime >= task.taskLength) {
                            newTime = task.taskLength
                            newStatus = "COMPLETE"
                        }
                        return Object.assign({}, task, {
                            taskStatus: newStatus,
                            pomoStatus: "BREAK",
                            taskTimeCompleted: newTime,
                            pomoStartTime: Date.now(),
                            pomoDuration: task.pomoBreakLength
                        });
                    }
                    else
                        return Object.assign({}, task, {
                            pomoStatus: "INACTIVE",
                        });
                }
                else return task
                })
        }

        case 'START_POMO': {
            return state.map(task => {
                if (task.id === action.id)
                    return Object.assign({}, task, {
                        taskStatus: "POMO",
                        pomoStatus: "ACTIVE",
                        pomoStartTime: Date.now(),
                        pomoDuration: task.pomoLength
                    });
                else return task
                })
        }

        default: return state || [];
    }
}



// Components

// const Tasks = ({ tasks }) => {
//     console.log("tasks", tasks)
//     // <Editabletask {...task}/>
//     return (
//         <div className="row journal">
//             {tasks.map(task =>
//                 <div key={task.id}>
//                     <Task {...task}/>
//                 </div>
//             )}
//         </div>
//     )
// }


class Tasks extends Component {
    constructor(props) {
        super(props);
        this.dispatch = props.dispatch
    }

    componentDidMount() {
        fetch("/api/tasks/list").then( (response, body) => {

            if(response.ok) {
                response.json().then(data => {
                    const tasks = data.data
                    let jstasks = []

                    for (const task of tasks) {
                        let jstask = {}
                        jstask.id = task.id
                        jstask.title = task.title
                        jstask.taskLength = task.task_length
                        jstask.taskTimeCompleted = task.task_time
                        // task.taskState = task.task_state;
                        jstask.pomoTime = task.pomo_time
                        jstask.pomoLength = task.pomo_length
                        jstask.pomoBreakLength = task.pomo_break_length
                        jstask.color = task.color
                        var hms = task.task_start_time
                        var a = hms.split(':'); // split it at the colons

                        var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
                        jstask.suggestedStartTime = seconds
                        // jstask.pomoState = task.pomoState

                        // just setting defaults
                        jstask.taskStatus = "INACTIVE"
                        jstask.pomoStatus = "INACTIVE"

                        // task.restore()
                        jstasks.push(jstask)
                    }

                    this.dispatch({
                        type: 'INIT',
                        newState: jstasks,
                    })
                })
            }
        })
    }

    render() {
        const { tasks } = this.props

        return (
            <div className="row">
                {tasks.map(task =>
                    <div key={task.id}>
                        <Task {...task}/>
                    </div>
                )}
            </div>
        );
    }
}

// Connecting

const mapStateToProps = (state, props) => {
    return {
        tasks: state.tasks
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        dispatch
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Tasks)
export { taskReducer }