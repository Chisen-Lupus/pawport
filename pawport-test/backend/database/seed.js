const bcrypt = require('bcryptjs');
const { sequelize, User, Con, Hotel, UserCon, UserConHotel } = require('./init');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('🌱 Starting database seeding...');
    
    // Create test hotels
    const hotels = await Hotel.bulkCreate([
      {
        name: '广州花园酒店',
        address: '广东省广州市越秀区环市东路368号',
        city: '广州',
        country: '中国',
        latitude: 23.1391,
        longitude: 113.2754,
        is_test: true,
      },
      {
        name: '成都世纪城天堂洲际大饭店',
        address: '四川省成都市高新区世纪城路88号',
        city: '成都',
        country: '中国',
        latitude: 30.5728,
        longitude: 104.0668,
        is_test: true,
      },
      {
        name: 'Hilton Chicago',
        address: '720 S Michigan Ave, Chicago, IL 60605',
        city: 'Chicago',
        country: 'USA',
        latitude: 41.8721,
        longitude: -87.6246,
        is_test: true,
      },
      {
        name: '上海国际会议中心大酒店',
        address: '上海市浦东新区滨江大道2727号',
        city: '上海',
        country: '中国',
        latitude: 31.2397,
        longitude: 121.4998,
        is_test: true,
      },
      {
        name: '测试会场',
        address: '北京市朝阳区',
        city: '北京',
        country: '中国',
        latitude: 39.9042,
        longitude: 116.4074,
        is_test: true,
      },
      {
        name: '北京星港酒店',
        address: '北京市朝阳区星港路88号',
        city: '北京',
        country: '中国',
        latitude: 39.9142,
        longitude: 116.4174,
        is_test: true,
      },
      {
        name: '朝阳会议酒店',
        address: '北京市朝阳区会议中心路12号',
        city: '北京',
        country: '中国',
        latitude: 39.8942,
        longitude: 116.3974,
        is_test: true,
      },
    ]);
    console.log(`  ✅ Created ${hotels.length} test hotels`);

    // Create test cons (including one "always open" con for testing)
    const now = new Date();
    const cons = await Con.bulkCreate([
      {
        name: '极兽聚',
        name_en: 'Polarfur',
        name_local: '极兽聚',
        series_key: 'polarfur',
        series_name: '极兽聚 Polarfur',
        edition_label: '2024',
        start_date: '2024-03-15',
        end_date: '2024-03-17',
        venue: '广州花园酒店',
        city: '广州',
        country: '中国',
        address: '广东省广州市越秀区环市东路368号',
        latitude: 23.1391,
        longitude: 113.2754,
        theme: '极地冒险',
        theme_color: '#4FC3F7',
        website: 'https://polarfur.cn',
        status: 'approved',
        is_test: true,
      },
      {
        name: '成都兽展 FurCon Chengdu',
        name_en: 'FurCon Chengdu',
        name_local: '成都兽展',
        series_key: 'furcon-chengdu',
        series_name: '成都兽展 FurCon Chengdu',
        edition_label: '2024',
        start_date: '2024-07-20',
        end_date: '2024-07-22',
        venue: '成都世纪城天堂洲际大饭店',
        city: '成都',
        country: '中国',
        address: '四川省成都市高新区世纪城路88号',
        latitude: 30.5728,
        longitude: 104.0668,
        theme: '巴蜀奇遇',
        theme_color: '#FF7043',
        status: 'approved',
        is_test: true,
      },
      {
        name: 'Midwest FurFest',
        name_en: 'Midwest FurFest',
        series_key: 'midwest-furfest',
        series_name: 'Midwest FurFest',
        edition_label: '2024',
        start_date: '2024-12-05',
        end_date: '2024-12-08',
        venue: 'Hyatt Regency O\'Hare',
        city: 'Chicago',
        country: 'USA',
        address: '9300 Bryn Mawr Ave, Rosemont, IL 60018',
        latitude: 41.9775,
        longitude: -87.8620,
        theme: 'A Roaring Good Time',
        theme_color: '#AB47BC',
        website: 'https://furfest.org',
        status: 'approved',
        is_test: true,
      },
      {
        name: '上海兽展 ShanghaiCon',
        name_en: 'ShanghaiCon',
        name_local: '上海兽展',
        series_key: 'shanghaicon',
        series_name: '上海兽展 ShanghaiCon',
        edition_label: '2024',
        start_date: '2024-10-01',
        end_date: '2024-10-03',
        venue: '上海国际会议中心',
        city: '上海',
        country: '中国',
        address: '上海市浦东新区滨江大道2727号',
        latitude: 31.2397,
        longitude: 121.4998,
        theme_color: '#26A69A',
        status: 'approved',
        is_test: true,
      },
      {
        // 永远开展的测试展 - 用于测试"当前展"效果
        name: '永恒兽展 (测试)',
        name_en: 'Eternal FurCon (Test)',
        name_local: '永恒兽展',
        series_key: 'eternal-furcon-test',
        series_name: '永恒兽展',
        edition_label: 'Always Open',
        start_date: '2020-01-01',
        end_date: '2099-12-31',
        venue: '测试会场',
        city: '北京',
        country: '中国',
        address: '北京市朝阳区',
        latitude: 39.9042,
        longitude: 116.4074,
        theme: '永恒测试',
        theme_color: '#FF5252',
        description: '这是一个永远开展的测试兽展，用于验证当前展览的显示效果',
        status: 'approved',
        is_test: true,
      },
      {
        name: '深圳兽展 FurryDeep',
        name_en: 'FurryDeep Shenzhen',
        name_local: '深圳兽展',
        series_key: 'furrydeep-shenzhen',
        series_name: '深圳兽展 FurryDeep',
        edition_label: '2025',
        start_date: '2025-05-01',
        end_date: '2025-05-03',
        venue: '深圳会展中心',
        city: '深圳',
        country: '中国',
        address: '广东省深圳市福田区福华三路',
        latitude: 22.5331,
        longitude: 114.0684,
        theme_color: '#66BB6A',
        status: 'approved',
        is_test: true,
      },
      {
        name: '极兽聚 2027',
        name_en: 'Polarfur 2027',
        name_local: '极兽聚',
        series_key: 'polarfur',
        series_name: '极兽聚 Polarfur',
        edition_label: '2027',
        start_date: '2027-03-12',
        end_date: '2027-03-14',
        venue: '广州白云国际会议中心',
        city: '广州',
        country: '中国',
        address: '广东省广州市白云区白云大道南1039-1045号',
        latitude: 23.1841,
        longitude: 113.2964,
        theme: '重返星港',
        theme_color: '#7C3AED',
        website: 'https://polarfur.cn',
        status: 'approved',
        is_test: true,
      },
    ]);
    console.log(`  ✅ Created ${cons.length} test cons`);

    // Create test users
    const passwordHash = await bcrypt.hash('test123456', 10);
    const users = await User.bulkCreate([
      {
        username: 'foxfire',
        email: 'foxfire@test.com',
        password_hash: passwordHash,
        display_name: '火狐',
        theme_color: '#FF5722',
        bio: '一只喜欢旅行的火狐',
        show_on_homepage: true,
        show_con_history: true,
        show_hotel_info: true,
        is_test: true,
        role: 'user',
      },
      {
        username: 'bluedragon',
        email: 'bluedragon@test.com',
        password_hash: passwordHash,
        display_name: '蓝龙',
        theme_color: '#2196F3',
        bio: '兽展爱好者，已参加20+场展',
        show_on_homepage: true,
        show_con_history: true,
        show_hotel_info: true,
        is_test: true,
        role: 'user',
      },
      {
        username: 'greenwolf',
        email: 'greenwolf@test.com',
        password_hash: passwordHash,
        display_name: '绿狼',
        theme_color: '#4CAF50',
        bio: '新人，第一次参展！',
        show_on_homepage: true,
        show_con_history: true,
        show_hotel_info: true,
        is_test: true,
        role: 'user',
      },
      {
        username: 'purplecat',
        email: 'purplecat@test.com',
        password_hash: passwordHash,
        display_name: '紫猫',
        theme_color: '#9C27B0',
        bio: '喜欢猫猫的小紫',
        show_on_homepage: true,
        show_con_history: false,
        show_hotel_info: true,
        is_test: true,
        role: 'user',
      },
      {
        username: 'admin',
        email: 'admin@pawport.me',
        password_hash: passwordHash,
        display_name: 'Admin',
        theme_color: '#607D8B',
        show_on_homepage: false,
        is_test: true,
        role: 'admin',
      },
    ]);
    const extraUsers = await User.bulkCreate(
      Array.from({ length: 18 }, (_, index) => {
        const number = String(index + 1).padStart(2, '0');
        const palette = ['#F97316', '#0EA5E9', '#22C55E', '#A855F7', '#EF4444', '#14B8A6'];
        return {
          username: `visitor${number}`,
          email: `visitor${number}@test.com`,
          password_hash: passwordHash,
          display_name: `旅客${number}`,
          theme_color: palette[index % palette.length],
          bio: '当前展头像列表测试用户',
          show_on_homepage: true,
          show_con_history: false,
          show_hotel_info: true,
          is_test: true,
          role: 'user',
        };
      })
    );
    console.log(`  ✅ Created ${users.length + extraUsers.length} test users`);

    // Create user-con relationships
    const userCons = await UserCon.bulkCreate([
      // foxfire: 去过极兽聚、成都兽展、永恒兽展
      { user_id: users[0].id, con_id: cons[0].id, comment: '第一次参展，非常开心！', rating: 5, visit_order: 1 },
      { user_id: users[0].id, con_id: cons[1].id, comment: '成都好吃的太多了', rating: 4, visit_order: 2 },
      { user_id: users[0].id, con_id: cons[4].id, comment: '测试当前展', visit_order: 3 },
      
      // bluedragon: 去过极兽聚、MFF、上海兽展、永恒兽展
      { user_id: users[1].id, con_id: cons[0].id, comment: '认识了很多朋友', rating: 5, visit_order: 1 },
      { user_id: users[1].id, con_id: cons[2].id, comment: 'MFF is amazing!', rating: 5, visit_order: 2 },
      { user_id: users[1].id, con_id: cons[3].id, comment: '上海的展也很棒', rating: 4, visit_order: 3 },
      { user_id: users[1].id, con_id: cons[4].id, visit_order: 4 },
      
      // greenwolf: 去过上海兽展、永恒兽展
      { user_id: users[2].id, con_id: cons[3].id, comment: '新人第一展！', rating: 5, visit_order: 1 },
      { user_id: users[2].id, con_id: cons[4].id, visit_order: 2 },
      
      // purplecat: 去过成都兽展
      { user_id: users[3].id, con_id: cons[1].id, comment: '和朋友一起去的~', rating: 4, visit_order: 1 },
    ]);

    const extraUserCons = await UserCon.bulkCreate(
      extraUsers.map(user => ({
        user_id: user.id,
        con_id: cons[4].id,
        comment: '正在永恒兽展测试头像气泡',
        visit_order: 1,
      }))
    );
    console.log(`  ✅ Created ${userCons.length + extraUsers.length} user-con relationships`);

    // Create user-con-hotel relationships
    await UserConHotel.bulkCreate([
      { user_con_id: userCons[0].id, hotel_id: hotels[0].id, check_in: '2024-03-14', check_out: '2024-03-18' },
      { user_con_id: userCons[1].id, hotel_id: hotels[1].id, check_in: '2024-07-19', check_out: '2024-07-23' },
      { user_con_id: userCons[2].id, hotel_id: hotels[4].id, check_in: '2026-07-01', check_out: '2026-07-03' },
      { user_con_id: userCons[4].id, hotel_id: hotels[2].id, check_in: '2024-12-04', check_out: '2024-12-09' },
      { user_con_id: userCons[5].id, hotel_id: hotels[3].id, check_in: '2024-09-30', check_out: '2024-10-04' },
      { user_con_id: userCons[6].id, hotel_id: hotels[5].id, check_in: '2026-07-01', check_out: '2026-07-04' },
      { user_con_id: userCons[8].id, hotel_id: hotels[6].id, check_in: '2026-07-02', check_out: '2026-07-03' },
      ...extraUserCons.map((userCon, index) => ({
        user_con_id: userCon.id,
        hotel_id: hotels[4 + (index % 3)].id,
        check_in: '2026-07-01',
        check_out: '2026-07-03',
      })),
    ]);
    console.log('  ✅ Created hotel assignments');

    console.log('\n🎉 Database seeding complete!');
    console.log('\n📝 Test accounts:');
    console.log('  - foxfire@test.com / test123456');
    console.log('  - bluedragon@test.com / test123456');
    console.log('  - greenwolf@test.com / test123456');
    console.log('  - purplecat@test.com / test123456');
    console.log('  - admin@pawport.me / test123456');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
