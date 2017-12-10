import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { createStore, combineReducers, applyMiddleware, bindActionCreators } from 'redux';
// import connect from 'react-redux';
import { Provider } from 'react-redux'
import thunk from 'redux-thunk'

import Journal from './Journal'
import { postReducer } from './Journal'

import Tasks from './Tasks'
import { taskReducer } from './Tasks'

import TodoList from './TodoList'
import { todoReducer } from './TodoList'

import Schedule from './Calendar'
import { scheduleReducer } from './Calendar'

import SoundPlayer from './SoundPlayer'
import { soundReducer } from './SoundPlayer'


const reducers = combineReducers({
    posts: postReducer,
    tasks: taskReducer,
    todos: todoReducer,
    sound: soundReducer
})

const actionLogger = ({dispatch, getState}) =>
        (next) => (action) => { console.log(action); return next(action) }

const middleware = applyMiddleware(actionLogger, thunk)
const store = createStore(
    reducers,
    {
        // posts: [],
        // tasks: [],
        // todos: [],
        // sound: {}
    },
    middleware
)


// class AggregatedEventSource extends Component {
//     constructor(url) {
//         super();

//         this.source = new EventSource(url);
//         this.state = {};

//         this.source.addEventListener('row', (event) => {
//             const payload = JSON.parse(event.data);
//             if (payload.new_val) { // added or updated
//                 this.state[payload.new_val.id] = payload.new_val;
//             } else { // deleted
//                 delete this.state[payload.old_val.id];
//             }

//             this.onNext(this.collection());
//         });
//     }

//     collection() {
//         return Object.keys(this.state).map(key => this.state[key]);
//     }
// }


class JournalApp extends Component {
    componentDidMount() {
        fetch("/api/journal/list").then( (response, body) => {

            if(response.ok) {
                response.json().then(data => {
                    const posts = data.data

                    for (const post of posts) {
                        post.created_date = new Date(post.created_date)
                        // post.edited_date = new Date(post.edited_date)
                    }

                    store.dispatch({
                        type: 'INIT',
                        newState: posts,
                    })
                })
            }
        })
    }

    render() {
        return (
            <div className="container App">
                <div className="jumbotron">
                    <h1>Journal</h1>
                    <p>for things</p>
                </div>
                    <Journal/>
            </div>
        );
    }
}

// export default JournalApp;

class TasksApp extends Component {
    render() {
        return (
            <div className="container App">
                <SoundPlayer/>
                <div className="row">
                    <Schedule/>
                    <Tasks/>
                    <TodoList/>
                </div>
            </div>
        );
    }
}

const render = () => {
    // <JournalApp />
    ReactDOM.render(
        <Provider store={store}>
            <TasksApp/>
        </Provider>,
        document.getElementById('root'));
}

store.subscribe(render)

export { render };