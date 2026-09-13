export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/diary/index',
    'pages/mine/index',
    'pages/login/index',
    'pages/profiles/index',
    'pages/camera-result/index',
    'pages/text-record/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '饮食计划',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#86909c',
    selectedColor: '#22a06b',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index', text: '今日' },
      { pagePath: 'pages/diary/index', text: '日记' },
      { pagePath: 'pages/mine/index', text: '我的' }
    ]
  }
})
