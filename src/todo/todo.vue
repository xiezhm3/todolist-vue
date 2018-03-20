<template>
    <section class="todo-app">
        <input
                type="text"
                class="add-input"
                autofocus="autofocus"
                placeholder="what to do next?"
                @keyup.enter="addTodo"
        />
        <Item
                :todo="todo"
                v-for="todo in filterTodos"
                :key="todo.id"
                @del="deleteTodo"
        />
        <Tabs
                :filter="filter"
                :todos="todos"
                @toggle="toggleFilter"
                @clearAllCompleted="clearAllCompleted"
        />
    </section>
</template>

<script>
    import Item from './item.vue'
    import Tabs from './tabs.vue'

    let id = 0;
    export default {
        data() {
            return {
                todos: [],
                filter: "all"
            }
        },
        name: "todo",
        computed: {
            filterTodos() {
                if(this.filter === "all") {
                    return this.todos;
                }
                const completed = this.filter === "completed";
                return this.todos.filter(todo => todo.completed === completed);
            }
        },
        methods: {
            addTodo(e) {
                this.todos.unshift({
                    id: id++,
                    content: e.target.value.trim(),
                    completed: false
                });
                e.target.value = "";
            },
            deleteTodo(id) {
                this.todos.splice(this.todos.findIndex(todo => todo.id === id), 1);
            },
            toggleFilter(state) {
                this.filter = state;
            },
            clearAllCompleted() {
                this.todos = this.todos.filter(todo => !todo.completed);
            }
        },
        components: {
            Item,
            Tabs
        }
    }
</script>

<style scoped lang="stylus">
    .todo-app {
        width: 600px
        margin: 0 auto
        box-shadow: 0 0 5px #666
    }

    .add-input {
        position: relative
        width: 100%
        font-size: 30px
        font-family: inherit
        font-weight: inherit
        line-height: 1.4em
        border: 1px solid #999
        padding: 16px 16px 16px 60px
        outline: none
        color: inherit
        box-shadow: inset 0 -1px 5px 0 rgb(0, 0, 0, 1)
        box-sizing: border-box
        font-smoothing: antialiased
    }

</style>