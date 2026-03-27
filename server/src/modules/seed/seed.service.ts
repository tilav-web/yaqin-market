import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Auth } from '../auth/auth.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Location } from '../location/location.entity';
import { Category } from '../category/category.entity';
import { Unit } from '../unit/unit.entity';
import { Product } from '../product/product.entity';
import { Store } from '../store/entities/store.entity';
import { StoreDeliverySettings } from '../store/entities/store-delivery-settings.entity';
import {
  DayOfWeek,
  StoreWorkingHour,
} from '../store/entities/store-working-hour.entity';
import {
  StoreProduct,
  StoreProductStatus,
} from '../store-product/store-product.entity';

type DemoAccountSeed = {
  phone: string;
  role: AuthRoleEnum;
  first_name: string;
  last_name: string;
  wallet_balance?: number;
};

type StoreSeed = {
  slug: string;
  name: string;
  ownerPhone: string;
  phone: string;
  owner_name: string;
  legal_name: string;
  address: string;
  lat: number;
  lng: number;
  logo: string;
  banner: string;
  is_prime: boolean;
  rating: number;
  reviews_count: number;
  max_delivery_radius: number;
  delivery_fee: number;
  min_order_amount: number;
};

type ProductSeed = {
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  unitName: string;
  image: string;
  basePrice: number;
  attributes?: Record<string, string>;
};

const CATEGORY_SEEDS = [
  {
    name: "Meva va sabzavot",
    slug: "meva-va-sabzavot",
    image:
      'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=800&q=80',
    order_number: 1,
  },
  {
    name: "Sut mahsulotlari",
    slug: "sut-mahsulotlari",
    image:
      'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
    order_number: 2,
  },
  {
    name: "Ichimliklar",
    slug: "ichimliklar",
    image:
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
    order_number: 3,
  },
  {
    name: "Bakaleya",
    slug: "bakaleya",
    image:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    order_number: 4,
  },
  {
    name: "Go'sht va muzlatilgan",
    slug: "gosht-va-muzlatilgan",
    image:
      'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
    order_number: 5,
  },
  {
    name: "Shirinlik va snack",
    slug: "shirinlik-va-snack",
    image:
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80',
    order_number: 6,
  },
  {
    name: "Uy-ro'zg'or",
    slug: "uy-rozgor",
    image:
      'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=800&q=80',
    order_number: 7,
  },
];

const UNIT_SEEDS = [
  { name: 'dona', short_name: 'dona' },
  { name: 'kg', short_name: 'kg' },
  { name: 'litr', short_name: 'l' },
  { name: 'qadoq', short_name: 'qad.' },
  { name: 'paket', short_name: 'pkt.' },
];

const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  {
    phone: '900000001',
    role: AuthRoleEnum.SUPER_ADMIN,
    first_name: 'Ali',
    last_name: 'Admin',
    wallet_balance: 0,
  },
  {
    phone: '900000002',
    role: AuthRoleEnum.CUSTOMER,
    first_name: 'Aziza',
    last_name: 'Mijoz',
    wallet_balance: 450000,
  },
  {
    phone: '900000003',
    role: AuthRoleEnum.COURIER,
    first_name: 'Jamshid',
    last_name: 'Kuryer',
    wallet_balance: 0,
  },
  {
    phone: '900000004',
    role: AuthRoleEnum.COURIER,
    first_name: 'Suhrob',
    last_name: 'Yetkazuvchi',
    wallet_balance: 0,
  },
  {
    phone: '900000005',
    role: AuthRoleEnum.COURIER,
    first_name: 'Maftuna',
    last_name: 'Courier',
    wallet_balance: 0,
  },
  {
    phone: '900000101',
    role: AuthRoleEnum.SELLER,
    first_name: 'Sardor',
    last_name: 'Xasanov',
  },
  {
    phone: '900000102',
    role: AuthRoleEnum.SELLER,
    first_name: 'Madina',
    last_name: 'Qosimova',
  },
  {
    phone: '900000103',
    role: AuthRoleEnum.SELLER,
    first_name: 'Behruz',
    last_name: 'Ergashev',
  },
  {
    phone: '900000104',
    role: AuthRoleEnum.SELLER,
    first_name: 'Dilnoza',
    last_name: 'Saidova',
  },
  {
    phone: '900000105',
    role: AuthRoleEnum.SELLER,
    first_name: 'Javohir',
    last_name: 'Nazarov',
  },
  {
    phone: '900000106',
    role: AuthRoleEnum.SELLER,
    first_name: 'Kamola',
    last_name: 'Yusupova',
  },
  {
    phone: '900000107',
    role: AuthRoleEnum.SELLER,
    first_name: 'Temur',
    last_name: 'Raximov',
  },
  {
    phone: '900000108',
    role: AuthRoleEnum.SELLER,
    first_name: 'Shahnoza',
    last_name: 'Karimova',
  },
];

const STORE_SEEDS: StoreSeed[] = [
  {
    slug: 'chilonzor-yaqin-market',
    name: 'Chilonzor Yaqin Market',
    ownerPhone: '900000101',
    phone: '712030101',
    owner_name: 'Sardor Xasanov',
    legal_name: 'Chilonzor Yaqin Market MCHJ',
    address: "Chilonzor tumani, Bunyodkor ko'chasi 12",
    lat: 41.285912,
    lng: 69.203118,
    logo:
      'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=400&q=80',
    banner:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80',
    is_prime: true,
    rating: 4.8,
    reviews_count: 164,
    max_delivery_radius: 18000,
    delivery_fee: 12000,
    min_order_amount: 50000,
  },
  {
    slug: 'mirzo-ulugbek-basket',
    name: 'Mirzo Ulugbek Basket',
    ownerPhone: '900000102',
    phone: '712030102',
    owner_name: 'Madina Qosimova',
    legal_name: 'Mirzo Ulugbek Basket XK',
    address: 'Mirzo Ulugbek tumani, Buyuk Ipak Yoli 88',
    lat: 41.338844,
    lng: 69.334177,
    logo:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=80',
    banner:
      'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=1400&q=80',
    is_prime: false,
    rating: 4.6,
    reviews_count: 97,
    max_delivery_radius: 14000,
    delivery_fee: 10000,
    min_order_amount: 40000,
  },
  {
    slug: 'yunusobod-family-store',
    name: 'Yunusobod Family Store',
    ownerPhone: '900000103',
    phone: '712030103',
    owner_name: 'Behruz Ergashev',
    legal_name: 'Yunusobod Family Store MCHJ',
    address: 'Yunusobod tumani, 19-kvartal, 24-uy',
    lat: 41.366142,
    lng: 69.288693,
    logo:
      'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=400&q=80',
    banner:
      'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=1400&q=80',
    is_prime: true,
    rating: 4.9,
    reviews_count: 211,
    max_delivery_radius: 16000,
    delivery_fee: 14000,
    min_order_amount: 60000,
  },
  {
    slug: 'sergeli-express-market',
    name: 'Sergeli Express Market',
    ownerPhone: '900000104',
    phone: '712030104',
    owner_name: 'Dilnoza Saidova',
    legal_name: 'Sergeli Express Market XK',
    address: 'Sergeli tumani, Yangi Sergeli 7A',
    lat: 41.226102,
    lng: 69.219807,
    logo:
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80',
    banner:
      'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=1400&q=80',
    is_prime: false,
    rating: 4.5,
    reviews_count: 83,
    max_delivery_radius: 22000,
    delivery_fee: 11000,
    min_order_amount: 45000,
  },
  {
    slug: 'shayxontohur-eco-market',
    name: 'Shayxontohur Eco Market',
    ownerPhone: '900000105',
    phone: '712030105',
    owner_name: 'Javohir Nazarov',
    legal_name: 'Shayxontohur Eco Market MCHJ',
    address: 'Shayxontohur tumani, Sagbon 41',
    lat: 41.324509,
    lng: 69.240911,
    logo:
      'https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&w=400&q=80',
    banner:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80',
    is_prime: false,
    rating: 4.7,
    reviews_count: 132,
    max_delivery_radius: 15000,
    delivery_fee: 9000,
    min_order_amount: 35000,
  },
  {
    slug: 'olmazor-discount-hub',
    name: 'Olmazor Discount Hub',
    ownerPhone: '900000106',
    phone: '712030106',
    owner_name: 'Kamola Yusupova',
    legal_name: 'Olmazor Discount Hub XK',
    address: 'Olmazor tumani, Sebzor 10',
    lat: 41.348731,
    lng: 69.205271,
    logo:
      'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=400&q=80',
    banner:
      'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1400&q=80',
    is_prime: true,
    rating: 4.8,
    reviews_count: 145,
    max_delivery_radius: 20000,
    delivery_fee: 10000,
    min_order_amount: 40000,
  },
  {
    slug: 'yashnobod-smart-mart',
    name: 'Yashnobod Smart Mart',
    ownerPhone: '900000107',
    phone: '712030107',
    owner_name: 'Temur Raximov',
    legal_name: 'Yashnobod Smart Mart MCHJ',
    address: 'Yashnobod tumani, Parkent ko‘chasi 102',
    lat: 41.31257,
    lng: 69.35711,
    logo:
      'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=400&q=80',
    banner:
      'https://images.unsplash.com/photo-1506617564039-2f3b650b7010?auto=format&fit=crop&w=1400&q=80',
    is_prime: true,
    rating: 4.7,
    reviews_count: 119,
    max_delivery_radius: 17000,
    delivery_fee: 11000,
    min_order_amount: 45000,
  },
  {
    slug: 'uchtepa-daily-food',
    name: 'Uchtepa Daily Food',
    ownerPhone: '900000108',
    phone: '712030108',
    owner_name: 'Shahnoza Karimova',
    legal_name: 'Uchtepa Daily Food XK',
    address: 'Uchtepa tumani, Foziltepa ko‘chasi 19',
    lat: 41.28644,
    lng: 69.16018,
    logo:
      'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=400&q=80',
    banner:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80',
    is_prime: false,
    rating: 4.6,
    reviews_count: 88,
    max_delivery_radius: 19000,
    delivery_fee: 9500,
    min_order_amount: 38000,
  },
];

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    slug: 'olma-gala',
    name: 'Olma Gala',
    description: "Shirin va suvli Gala navi, kundalik iste'mol uchun.",
    categorySlug: 'meva-va-sabzavot',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=800&q=80',
    basePrice: 18000,
  },
  {
    slug: 'banan-ecuador',
    name: 'Banan Ecuador',
    description: 'Import sifatli banan, yumshoq va shirin taʼm.',
    categorySlug: 'meva-va-sabzavot',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1574226516831-e1dff420e37f?auto=format&fit=crop&w=800&q=80',
    basePrice: 26000,
  },
  {
    slug: 'pomidor-pushti',
    name: "Pomidor pushti",
    description: 'Salat va taomlar uchun yangi pushti pomidor.',
    categorySlug: 'meva-va-sabzavot',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1546470427-e5ac89cd0b9d?auto=format&fit=crop&w=800&q=80',
    basePrice: 22000,
  },
  {
    slug: 'bodring-sersuv',
    name: 'Bodring sersuv',
    description: "Yangi uzilgan bodring, ertalabki salat uchun ayni muddao.",
    categorySlug: 'meva-va-sabzavot',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=800&q=80',
    basePrice: 17000,
  },
  {
    slug: 'kartoshka-yangi',
    name: 'Kartoshka yangi',
    description: "Qovurish va sho'rva uchun universal kartoshka.",
    categorySlug: 'meva-va-sabzavot',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80',
    basePrice: 8000,
  },
  {
    slug: 'piyoz-sariq',
    name: "Piyoz sariq",
    description: 'Taomga mazali taʼm beruvchi sariq piyoz.',
    categorySlug: 'meva-va-sabzavot',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=800&q=80',
    basePrice: 7000,
  },
  {
    slug: 'sut-1l',
    name: 'Sut 1L',
    description: 'Tabiiy sigir suti, 1 litr tetrapak.',
    categorySlug: 'sut-mahsulotlari',
    unitName: 'litr',
    image:
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
    basePrice: 13500,
  },
  {
    slug: 'qatiq-1l',
    name: 'Qatiq 1L',
    description: 'Yengil va foydali tabiiy qatiq.',
    categorySlug: 'sut-mahsulotlari',
    unitName: 'litr',
    image:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
    basePrice: 14500,
  },
  {
    slug: 'qaymoq-15',
    name: 'Qaymoq 15%',
    description: 'Nonushta va desertlar uchun qaymoq.',
    categorySlug: 'sut-mahsulotlari',
    unitName: 'qadoq',
    image:
      'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
    basePrice: 21000,
  },
  {
    slug: 'tuxum-10',
    name: 'Tuxum 10 talik',
    description: 'Yangi tuxum, 10 dona lik qadoq.',
    categorySlug: 'sut-mahsulotlari',
    unitName: 'qadoq',
    image:
      'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80',
    basePrice: 19500,
  },
  {
    slug: 'tandir-non',
    name: 'Tandir non',
    description: 'Har kuni pishiriladigan tandir non.',
    categorySlug: 'bakaleya',
    unitName: 'dona',
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    basePrice: 4500,
  },
  {
    slug: 'guruch-lazer',
    name: 'Guruch Lazer',
    description: 'Palov uchun sifatli lazer guruch.',
    categorySlug: 'bakaleya',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    basePrice: 21000,
  },
  {
    slug: 'un-birinchi-nav',
    name: 'Un birinchi nav',
    description: 'Pishiriq va non uchun birinchi nav un.',
    categorySlug: 'bakaleya',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1603048719539-9ecb7f1b3b5f?auto=format&fit=crop&w=800&q=80',
    basePrice: 8500,
  },
  {
    slug: 'shakar-oq',
    name: 'Shakar oq',
    description: 'Tozalangan oq shakar, 1 kg.',
    categorySlug: 'bakaleya',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?auto=format&fit=crop&w=800&q=80',
    basePrice: 14500,
  },
  {
    slug: 'choy-qora',
    name: 'Qora choy',
    description: 'Kunlik choynak uchun xushboʻy qora choy.',
    categorySlug: 'bakaleya',
    unitName: 'qadoq',
    image:
      'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&w=800&q=80',
    basePrice: 23000,
  },
  {
    slug: 'cola-15l',
    name: 'Cola 1.5L',
    description: 'Sovutilgan holda ichish uchun gazlangan ichimlik.',
    categorySlug: 'ichimliklar',
    unitName: 'litr',
    image:
      'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=800&q=80',
    basePrice: 12000,
  },
  {
    slug: 'fanta-15l',
    name: 'Fanta 1.5L',
    description: 'Apelsin taʼmli gazlangan ichimlik.',
    categorySlug: 'ichimliklar',
    unitName: 'litr',
    image:
      'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80',
    basePrice: 12000,
  },
  {
    slug: 'suv-gazsiz-15l',
    name: 'Suv gazsiz 1.5L',
    description: 'Kunlik isteʼmol uchun toza ichimlik suvi.',
    categorySlug: 'ichimliklar',
    unitName: 'litr',
    image:
      'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=800&q=80',
    basePrice: 4500,
  },
  {
    slug: 'sharbat-olma-1l',
    name: 'Olma sharbati 1L',
    description: 'Mevali, bolalar va kattalar uchun qulay sharbat.',
    categorySlug: 'ichimliklar',
    unitName: 'litr',
    image:
      'https://images.unsplash.com/photo-1600271886742-f049cd5bba3f?auto=format&fit=crop&w=800&q=80',
    basePrice: 18000,
  },
  {
    slug: 'tovuq-filesi',
    name: 'Tovuq filesi',
    description: 'Toza kesilgan tovuq filesi, muzlatilgan emas.',
    categorySlug: 'gosht-va-muzlatilgan',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80',
    basePrice: 42000,
  },
  {
    slug: 'mol-goshti',
    name: "Mol go'shti",
    description: 'Taom va qovurma uchun yangi mol goʻshti.',
    categorySlug: 'gosht-va-muzlatilgan',
    unitName: 'kg',
    image:
      'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=800&q=80',
    basePrice: 98000,
  },
  {
    slug: 'kolbasa-doktor',
    name: 'Kolbasa doktor',
    description: 'Sendvich va nonushta uchun yumshoq kolbasa.',
    categorySlug: 'gosht-va-muzlatilgan',
    unitName: 'qadoq',
    image:
      'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
    basePrice: 36000,
  },
  {
    slug: 'pishloq-gauda',
    name: 'Pishloq gauda',
    description: 'Kesilgan qadoqda yumshoq pishloq.',
    categorySlug: 'sut-mahsulotlari',
    unitName: 'qadoq',
    image:
      'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80',
    basePrice: 32000,
  },
  {
    slug: 'saryog-200g',
    name: "Saryog' 200g",
    description: 'Tabiiy saryogʻ, nonushta va pishiriq uchun.',
    categorySlug: 'sut-mahsulotlari',
    unitName: 'qadoq',
    image:
      'https://images.unsplash.com/photo-1589985270958-bf08755f0a8b?auto=format&fit=crop&w=800&q=80',
    basePrice: 21000,
  },
  {
    slug: 'chips-paprika',
    name: 'Chips paprika',
    description: 'Paprika taʼmli qarsildoq snack.',
    categorySlug: 'shirinlik-va-snack',
    unitName: 'qadoq',
    image:
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80',
    basePrice: 16000,
  },
  {
    slug: 'shokolad-sutli',
    name: 'Sutli shokolad',
    description: 'Yumshoq sutli shokolad batonchasi.',
    categorySlug: 'shirinlik-va-snack',
    unitName: 'dona',
    image:
      'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80',
    basePrice: 12500,
  },
  {
    slug: 'pechenye-choyga',
    name: 'Pechenye choyga',
    description: 'Choy bilan isteʼmol qilish uchun pechenye.',
    categorySlug: 'shirinlik-va-snack',
    unitName: 'qadoq',
    image:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80',
    basePrice: 14000,
  },
  {
    slug: 'kir-yuvish-kukuni',
    name: 'Kir yuvish kukuni',
    description: 'Rangli va oq kiyimlar uchun universal kukun.',
    categorySlug: 'uy-rozgor',
    unitName: 'paket',
    image:
      'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=800&q=80',
    basePrice: 39000,
  },
  {
    slug: 'sovun-antibakterial',
    name: 'Sovun antibakterial',
    description: 'Qoʻl va tana uchun yumshoq sovun.',
    categorySlug: 'uy-rozgor',
    unitName: 'dona',
    image:
      'https://images.unsplash.com/photo-1584305574647-acf8069a3d2b?auto=format&fit=crop&w=800&q=80',
    basePrice: 8000,
  },
  {
    slug: 'kungaboqar-yogi-1l',
    name: "Kungaboqar yog'i 1L",
    description: 'Qovurish va salat uchun tozalangan yogʻ.',
    categorySlug: 'bakaleya',
    unitName: 'litr',
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
    basePrice: 18500,
  },
];

const STORE_PRICE_FACTORS = [1, 1.04, 0.98, 1.08, 1.02, 0.95, 1.06, 0.97];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async run() {
    const unitRepo = this.dataSource.getRepository(Unit);
    const categoryRepo = this.dataSource.getRepository(Category);
    const productRepo = this.dataSource.getRepository(Product);
    const authRepo = this.dataSource.getRepository(Auth);
    const userRepo = this.dataSource.getRepository(User);
    const walletRepo = this.dataSource.getRepository(Wallet);
    const locationRepo = this.dataSource.getRepository(Location);
    const storeRepo = this.dataSource.getRepository(Store);
    const deliverySettingsRepo =
      this.dataSource.getRepository(StoreDeliverySettings);
    const workingHourRepo = this.dataSource.getRepository(StoreWorkingHour);
    const storeProductRepo = this.dataSource.getRepository(StoreProduct);

    this.logger.log('Seed started');

    const units = await this.seedUnits(unitRepo);
    const categories = await this.seedCategories(categoryRepo);
    const products = await this.seedProducts(productRepo, categories, units);
    const accounts = await this.seedAccounts(
      authRepo,
      userRepo,
      walletRepo,
      locationRepo,
    );
    const stores = await this.seedStores(
      storeRepo,
      deliverySettingsRepo,
      workingHourRepo,
      accounts,
    );
    await this.seedStoreProducts(storeProductRepo, stores, products);

    this.logger.log('Seed completed successfully');
  }

  private async seedUnits(unitRepo: Repository<Unit>) {
    const result = new Map<string, Unit>();

    for (const seed of UNIT_SEEDS) {
      let unit = await unitRepo.findOne({ where: { name: seed.name } });

      if (!unit) {
        unit = unitRepo.create(seed);
      } else {
        unit.short_name = seed.short_name;
      }

      result.set(seed.name, await unitRepo.save(unit));
    }

    this.logger.log(`Units ready: ${result.size}`);
    return result;
  }

  private async seedCategories(categoryRepo: Repository<Category>) {
    const result = new Map<string, Category>();

    for (const seed of CATEGORY_SEEDS) {
      let category = await categoryRepo.findOne({ where: { slug: seed.slug } });

      if (!category) {
        category = categoryRepo.create(seed);
      } else {
        Object.assign(category, seed);
      }

      result.set(seed.slug, await categoryRepo.save(category));
    }

    this.logger.log(`Categories ready: ${result.size}`);
    return result;
  }

  private async seedProducts(
    productRepo: Repository<Product>,
    categories: Map<string, Category>,
    units: Map<string, Unit>,
  ) {
    const result = new Map<string, Product>();

    for (const seed of PRODUCT_SEEDS) {
      const category = categories.get(seed.categorySlug);
      const unit = units.get(seed.unitName);

      if (!category) {
        throw new Error(`Category not found for product ${seed.slug}`);
      }

      if (!unit) {
        throw new Error(`Unit not found for product ${seed.slug}`);
      }

      let product = await productRepo.findOne({ where: { slug: seed.slug } });

      if (!product) {
        product = productRepo.create({
          slug: seed.slug,
          name: seed.name,
          description: seed.description,
          category,
          unit,
          images: [{ url: seed.image, is_main: true }],
          attributes: seed.attributes ?? {},
          is_active: true,
        });
      } else {
        product.name = seed.name;
        product.description = seed.description;
        product.category = category;
        product.unit = unit;
        product.images = [{ url: seed.image, is_main: true }];
        product.attributes = seed.attributes ?? {};
        product.is_active = true;
      }

      result.set(seed.slug, await productRepo.save(product));
    }

    this.logger.log(`Products ready: ${result.size}`);
    return result;
  }

  private async seedAccounts(
    authRepo: Repository<Auth>,
    userRepo: Repository<User>,
    walletRepo: Repository<Wallet>,
    locationRepo: Repository<Location>,
  ) {
    const usersByPhone = new Map<string, User>();

    for (const seed of DEMO_ACCOUNTS) {
      let auth = await authRepo.findOne({
        where: { phone: seed.phone },
        relations: ['user'],
      });

      if (!auth) {
        auth = authRepo.create({
          phone: seed.phone,
          role: seed.role,
          is_verified: true,
        });
        auth = await authRepo.save(auth);
      } else {
        auth.role = seed.role;
        auth.phone = seed.phone;
        auth.is_verified = true;
        auth = await authRepo.save(auth);
      }

      let user =
        auth.user ??
        (await userRepo.findOne({
          where: { auth: { id: auth.id } },
          relations: ['auth'],
        }));

      if (!user) {
        user = userRepo.create({
          first_name: seed.first_name,
          last_name: seed.last_name,
          auth,
        });
      } else {
        user.first_name = seed.first_name;
        user.last_name = seed.last_name;
        user.auth = auth;
      }

      user = await userRepo.save(user);
      usersByPhone.set(seed.phone, user);

      let wallet = await walletRepo.findOne({
        where: { user: { id: user.id } },
        relations: ['user'],
      });

      if (!wallet) {
        wallet = walletRepo.create({
          balance: seed.wallet_balance ?? 0,
          frozen_balance: 0,
          user,
        });
      } else {
        wallet.balance = seed.wallet_balance ?? wallet.balance ?? 0;
        wallet.user = user;
      }

      await walletRepo.save(wallet);
    }

    const customer = usersByPhone.get('900000002');
    if (customer) {
      const existingLocation = await locationRepo.findOne({
        where: { user: { id: customer.id }, label: 'Uy' },
        relations: ['user'],
      });

      const locationPayload = {
        label: 'Uy',
        lat: 41.311081,
        lng: 69.240562,
        address_line: 'Toshkent shahri, Amir Temur xiyoboni',
        landmark: 'Metro yaqinida',
        is_default: true,
        user: customer,
      };

      if (!existingLocation) {
        await locationRepo.save(locationRepo.create(locationPayload));
      } else {
        Object.assign(existingLocation, locationPayload);
        await locationRepo.save(existingLocation);
      }
    }

    this.logger.log(`Accounts ready: ${usersByPhone.size}`);
    return usersByPhone;
  }

  private async seedStores(
    storeRepo: Repository<Store>,
    deliverySettingsRepo: Repository<StoreDeliverySettings>,
    workingHourRepo: Repository<StoreWorkingHour>,
    accounts: Map<string, User>,
  ) {
    const storesBySlug = new Map<string, Store>();

    for (const seed of STORE_SEEDS) {
      const owner = accounts.get(seed.ownerPhone);

      if (!owner) {
        throw new Error(`Owner not found for phone ${seed.ownerPhone}`);
      }

      let store = await storeRepo.findOne({
        where: { slug: seed.slug },
        relations: ['deliverySettings', 'workingHours'],
      });

      if (!store) {
        store = storeRepo.create({
          ...seed,
          owner_id: owner.id,
          is_active: true,
        });
      } else {
        Object.assign(store, {
          ...seed,
          owner_id: owner.id,
          is_active: true,
        });
      }

      store = await storeRepo.save(store);
      storesBySlug.set(seed.slug, store);

      let settings = await deliverySettingsRepo.findOne({
        where: { store_id: store.id },
      });

      if (!settings) {
        settings = deliverySettingsRepo.create({
          store_id: store.id,
        });
      }

      settings.min_order_amount = seed.min_order_amount;
      settings.delivery_fee = seed.delivery_fee;
      settings.preparation_time = 20;
      settings.free_delivery_radius = 2000;
      settings.delivery_price_per_km = 2500;
      settings.max_delivery_radius = seed.max_delivery_radius;
      settings.is_delivery_enabled = true;
      await deliverySettingsRepo.save(settings);

      await workingHourRepo.delete({ store_id: store.id });
      await workingHourRepo.save(
        Object.values(DayOfWeek).map((day) =>
          workingHourRepo.create({
            store_id: store.id,
            day_of_week: day,
            open_time: '08:00',
            close_time: '23:00',
            is_open: day !== DayOfWeek.SUNDAY,
          }),
        ),
      );
    }

    this.logger.log(`Stores ready: ${storesBySlug.size}`);
    return storesBySlug;
  }

  private async seedStoreProducts(
    storeProductRepo: Repository<StoreProduct>,
    stores: Map<string, Store>,
    products: Map<string, Product>,
  ) {
    const seededStores = Array.from(stores.values());
    const seededProducts = PRODUCT_SEEDS.map((seed) => ({
      ...seed,
      entity: products.get(seed.slug),
    })).filter((seed) => seed.entity);

    for (const [storeIndex, store] of seededStores.entries()) {
      const factor = STORE_PRICE_FACTORS[storeIndex] ?? 1;

      for (const [productIndex, seed] of seededProducts.entries()) {
        const product = seed.entity as Product;
        const availableForStore =
          (productIndex + storeIndex) % 5 !== 0 || storeIndex < 3;

        if (!availableForStore) {
          continue;
        }

        const stock =
          (productIndex + storeIndex) % 9 === 0
            ? 0
            : 10 + ((productIndex * 7 + storeIndex * 5) % 36);
        const price = Math.round(seed.basePrice * factor);

        let storeProduct = await storeProductRepo.findOne({
          where: {
            store_id: store.id,
            product_id: Number(product.id),
          },
        });

        if (!storeProduct) {
          storeProduct = storeProductRepo.create({
            store_id: store.id,
            product_id: Number(product.id),
          });
        }

        storeProduct.price = price;
        storeProduct.stock = stock;
        storeProduct.is_prime = store.is_prime && productIndex % 6 === 0;
        storeProduct.status =
          stock > 0
            ? StoreProductStatus.ACTIVE
            : StoreProductStatus.OUT_OF_STOCK;

        await storeProductRepo.save(storeProduct);
      }
    }

    this.logger.log('Store inventory ready');
  }
}
