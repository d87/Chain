import React, { Component } from 'react';
import { connect } from 'react-redux';
import EditableTodo from './Todo';

// import Sound from 'react-sound';

const todoAdd = (title) => {
    return {
        type: "ADD",
        title: title
    }
}


// Reducer

const todoReducer = (state = {}, action) => {
    switch (action.type) {
        case 'TODO_INIT': {
            return action.newState
        }
        case 'TODO_TOGGLE_EXPAND': {
            return state.map(todo => {
                if (todo.id === action.id && !todo.isEditing )
                    return Object.assign({}, todo, { isExpanded: !todo.isExpanded });
                else return todo
                })
        }
        case 'TODO_EDIT': {
            return state.map(todo => {
                if (todo.id === action.id) {
                    return Object.assign({}, todo, { isEditing: true, isExpanded: true });
                }
                else return todo
                })
        }
        case 'ADD':  {
            for (const post of state) {
                if (post.id === null)
                    return state;
            }
            return [
                {
                    id: null,
                    isEditing: true,
                    title: action.title,
                    description_raw: "",
                    color: "",
                    state: "ACTIVE",
                    created_date: Date.now()
                },
                ...state
            ]
        }
        // case 'ADD_CONFIRM':{
        //     return state.map(post => {
        //         if (post.id === null)
        //             return Object.assign({}, post,
        //                 {
        //                     id: action.data.id,
        //                     isEditing: false,
        //                     text: action.data.text,
        //                     created_date: new Date(action.data.created_date)
        //                 });
        //         else return post
        //         })
        // }
        
        case 'SAVE': {
            return state.map(todo => {
                if (todo.id === action.id)
                    return Object.assign({}, todo, {
                        isEditing: false,
                        description_raw: action.newData.body,
                        priority: action.newData.priority,
                        color: action.newData.color
                    });
                else return todo
                })
        }
        case 'DELETE': {
            return state.filter(todo => {
                    return todo.id !== action.id;
                })
        }

        default: return state || [];
    }
}



// Components

// const TodoList = ({ posts, onAddClick }) => {
//     return (
//         <div className="row journal">
//             <div className="col-sm-12">
//                 <button className="btn btn-primary btn-margin" onClick={onAddClick}>New Entry</button>
//             </div>
//             {posts.map(post =>
//                 <div key={post.id} className="col-sm-4">
//                     <div className="well">
//                         <EditableTodo {...post}/>
//                     </div>
//                 </div>
//             )}
//         </div>
//     )
// }

class TodoList extends Component {
    constructor(props) {
        super(props);
        this.dispatch = props.dispatch
        this.state = {
            title: ""
        }
    }

    handleAddSubmit(event) {
        event.preventDefault();
        return this.props.onAddClick(this.state.title)
    }

    handleAddTitleChange(title) {
        this.setState({ title: title })
    }


    componentDidMount() {
        fetch("/api/listtask/list").then( (response, body) => {

            if(response.ok) {
                response.json().then(data => {
                    const todos = data.data

                    for (const todo of todos) {
                        todo.created_date = new Date(todo.created_date)
                    }
                    console.log("TODOS", todos)
                    // let jstasks = []

                    // for (const task of tasks) {
                    //     let jstask = {}
                    //     jstask.id = task.id
                    //     jstask.title = task.title
                    //     jstask.taskLength = task.task_length
                    //     jstask.taskTimeCompleted = task.task_time
                    //     // task.taskState = task.task_state;
                    //     jstask.pomoTime = task.pomo_time
                    //     jstask.pomoLength = task.pomo_length
                    //     jstask.pomoBreakLength = task.pomo_break_length
                    //     var hms = task.task_start_time
                    //     var a = hms.split(':'); // split it at the colons

                    //     var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
                    //     jstask.suggestedStartTime = seconds
                    //     // jstask.pomoState = task.pomoState

                    //     // just setting defaults
                    //     jstask.taskStatus = "INACTIVE"
                    //     jstask.pomoStatus = "INACTIVE"

                    //     // task.restore()
                    //     jstasks.push(jstask)
                    // }

                    this.dispatch({
                        type: 'TODO_INIT',
                        newState: todos,
                    })
                })
            }
        })
    }

    render() {
        const { todos, onAddClick } = this.props

        return (
            <div id="listtask_container">
                <form id="addform" action="" method="post">
                    <a id="addbtn" onClick={this.handleAddSubmit}></a>
                    <input type="text" name="title" tabIndex="-1" onChange={this.handleAddTitleChange} value={this.state.title}></input>
                </form>
                {todos.map(todo =>
                    <div key={todo.id} >
                        <EditableTodo {...todo}/>
                    </div>
                )}
            </div>
        )
    }
}

// Connecting

const compare_priorities = (a,b) => {
    const ap = a.priority
    const bp = b.priority
    if (ap > bp) {
        return -1;
    }
    if (ap < bp) {
        return 1;
    }
    return 0;
}

const mapStateToProps = (state, props) => {
    const sorted_todos = [...state.todos]
    sorted_todos.sort(compare_priorities)
    return {
        todos: sorted_todos
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        dispatch,

        onAddClick: (title) => {
            dispatch(todoAdd(title))
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(TodoList)
export { todoReducer }
