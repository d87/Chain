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



const reducers = combineReducers({
    posts: postReducer,
    tasks: taskReducer,
    todos: todoReducer
})

const actionLogger = ({dispatch, getState}) =>
        (next) => (action) => { console.log(action); return next(action) }

const middleware = applyMiddleware(actionLogger, thunk)
const store = createStore(
    reducers,
    {
        posts: [
            // {
            //     id: 1,
            //     text: "After shattering the Worldstone, the young Amazon Cassia had changed. She had seen hatred, terror, and destruction firsthand. If the Askari were to survive the coming darkness, they needed an army. She would begin their training immediately.",
            //     isEditing: false,
            //     created_date: Date.now()
            // },

            // {
            //     id: 2,
            //     text: "Since his activation, Probius has always wanted to prove himself. He may be small, but he made a big difference by warping in a critical pylon during the retaking of Aiur. As the bravest of probes, Probius is eager to fulfill his purpose in the Nexus.",
            //     isEditing: false,
            //     created_date: Date.now()-2
            // },

            // {
            //     id: 3,
            //     text: "From the streets of Rio to the clubs on King's Row, Lúcio's beats bring the party to life, and drive the people to action. Now he's on tour in the Nexus, ready to break it down, and to continue fighting for what's right.",
            //     isEditing: false,
            //     created_date: Date.now()-4
            // }
        ],
        tasks: [
        ],
        todos: [
        ]
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
                    <h1>My Damn Journal</h1>
                    <p>so here goes...</p>
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
                <Schedule/>
                <Tasks/>
                <TodoList/>
            </div>
        );
    }
}

const render = () => {
    console.log('rednering')
    // <JournalApp />
    ReactDOM.render(
        <Provider store={store}>
            <TasksApp/>
        </Provider>,
        document.getElementById('root'));
}

store.subscribe(render)

export { render };