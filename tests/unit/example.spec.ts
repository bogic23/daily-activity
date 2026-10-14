import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import { describe, expect, test } from 'vitest'

describe('HomePage.vue', () => {
  test('renders dashboard greeting', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomePage }]
    })
    router.push('/')
    await router.isReady()
    const wrapper = mount(HomePage, {
      global: {
        plugins: [router]
      }
    })
    expect(wrapper.text()).toMatch(/Good (morning|afternoon|evening)/)
  })
})
