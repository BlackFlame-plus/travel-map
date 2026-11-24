/**
 * PC / H5 断点（与 CSS、map-engine isMobile 一致：720px）
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const MQ = '(max-width: 720px)'

export function useIsMobile() {
  // 首屏就按真实宽度判断，避免先按 PC 挂载再闪成 H5
  const isMobile = ref(
    typeof window !== 'undefined' ? window.matchMedia(MQ).matches : false,
  )

  let mql: MediaQueryList | null = null
  const sync = () => {
    isMobile.value = !!mql?.matches
  }

  onMounted(() => {
    mql = window.matchMedia(MQ)
    sync()
    mql.addEventListener('change', sync)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', sync)
  })

  return { isMobile }
}
