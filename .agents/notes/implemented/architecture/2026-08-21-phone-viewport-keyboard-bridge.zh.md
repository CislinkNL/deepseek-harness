# Agent Note: Phone viewport — soft-keyboard bridge, send dismissal, and the settings sheet

Status: implemented

> 范围：浏览器客户端的三个手机视口行为——输入法弹出时保持 composer 可见、触屏发送后收起键盘、设置页的窄视口布局。窄视口让位链（侧栏抽屉、导轨隐藏）早于本 note，仍由 AppFrame 拥有。

## Problem

手机上软键盘会遮挡 composer：保持布局视口全高的浏览器（iOS Safari）让 `100%` 高度的 frame 伸到键盘底下，触发焦点的那块输入区消失在键盘后。触屏发送后键盘继续盖在回复流上，因为 composer 的 `keepFocus` mousedown 处理器为桌面连续输入刻意恢复 textarea 焦点。另外，设置壳是居中的 800px 双栏弹窗——手机视口上 188px 的导航栏让内容栏不可读。

## Decision

- **键盘可见性是布局事实，不是组件关注点。** `apps/web/index.html` 设置 `interactive-widget=resizes-content`，Android Chrome 因此缩放布局视口，frame 的 `100%` 高度自动跟踪可见区。对不缩放布局视口的浏览器，AppFrame 把被遮挡高度——`documentElement.clientHeight − visualViewport.height − visualViewport.offsetTop`，下限为零——镜像到 frame 根上的 `--dsh-keyboard-inset`，`.frame` 计算 `height: calc(100% − var(--dsh-keyboard-inset, 0px))`。两种机制可组合：布局视口已缩小时 inset 为零。
- **发送收起键盘是指针类别事实。** `onPrimary` 只在 `matchMedia('(hover: none) and (pointer: coarse)')` 匹配时 blur textarea；hover 指针与无 matchMedia 的嵌入环境保持焦点。守卫位于提交成功路径内而非 `keepFocus`，Stop 与禁用按压不会收起。
- **设置手机 sheet 是独立的 CSS Module，经 clsx 叠加。** `SettingsRoot.mobile.module.css` 只含 `@media (max-width: 560px)` 覆盖（全屏单栏面板、横向标签条、贴边内边距）；SettingsRoot 将其与基础类合并。桌面输出不受影响，因为该文件的规则只存在于媒体查询内，导入顺序让合并顺序确定。团队任务浮动按钮在同一断点内联处理：贴右缘、抬离堆叠的 composer。

## Alternatives considered

**聚焦时逐元素 `scrollIntoView`。** 把聚焦控件滚进可视视口而非缩放 frame。落选：每个可聚焦面（composer、停靠面板、对话框）都要重复一遍，与 iOS 自身的揭示启发式打架，且 frame 下部区域（队列坞、任务条）仍被覆盖。

**仅对 composer 做固定平移。** 比 frame inset 便宜，但把 composer 移出其网格行：粘性定位与会话滚动区对 composer 位置的判断随即分裂，重新引入共享滚动区决策刚消除的分歧。

**发送时无条件 blur。** 一行代码、无需媒体查询——但桌面用户每条消息后失焦，破坏主输入面的连续输入。

**独立的手机设置组件。** 手机布局完全自由，但复制壳的 slot 接线、对话框语义与 Escape 处理；媒体查询模块保住一个组件、一棵行为树。

## Consequences

一种机制（frame inset）服务所有面，代价是整体收缩应用而非只隔离聚焦控件。inset 立即生效——无缓动——因为键盘自身已在动画，为过渡做 reduced-motion 门控没有收益。手机设置 sheet 保留模态对话框语义（Escape、遮罩点击、焦点落点）而非手机原生导航。560px 断点沿用既有窄视口先例（引导对话框、工作流面板），不引入手机专用 token。

## Testing

`packages/client/ui-layout/tests/app-frame.client.spec.tsx` 以 stub 的 `visualViewport` 走 遮挡 → 清除 → 卸载，断言 inset 属性与监听器拆除。`packages/client/ui-conversation/tests/input-bar.client.spec.tsx` 覆盖两种指针类别：粗指针发送 blur composer，hover 指针发送保持焦点。`pnpm run test:gui` 与 `DSH_SNAPSHOT=replay pnpm run test:web` 保持绿色；回放车道以桌面宽度运行，手机分支在组件级覆盖。
