<template>
    <section class="todo-app">
        <input
                type="text"
                class="add-input"
                autofocus="autofocus"
                placeholder="what to do next?"
                @keyup.enter="addTodo"
        />
        <Item :todo="todo"></Item>
        <Tabs :filter="filter"></Tabs>
    </section>
</template>

<script>
    import Item from './item.vue'
    import Tabs from './tabs.vue'

    export default {
        data() {
            return {
                todo: {
                    id: 0,
                    content: "this is a todo",
                    completed: false
                },
                filter: "all"
            }
        },
        name: "todo",
        methods: {
            addTodo() {
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