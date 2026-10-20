'use client'
import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import Image from 'next/image';
import styles from './herosection.module.css';

export default function HeroSection() {
    return (
        <div className={styles.heroSwiperWrapper}>
            <Swiper
                modules={[Pagination, Autoplay, EffectFade]}
                spaceBetween={0}
                slidesPerView={1}
                pagination={{ 
                    clickable: true,
                    dynamicBullets: true 
                }}
                autoplay={{ 
                    delay: 5000,
                    disableOnInteraction: false 
                }}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                loop={true}
                speed={1500}
                className={styles.heroSwiper}
            >

                    <Image 
                        src="./updatedImages/heroImg.png" 
                        alt="Beautiful destination 1" 
                        fill
                        priority
                        sizes="100vw"
                        style={{ objectFit: 'cover' }}
                        quality={60}
                    />
                {/* <SwiperSlide className={styles.heroSlide}>
                    <Image 
                        src="/images/hero/hero3.jpg" 
                        alt="Beautiful destination 2" 
                        fill
                        sizes="100vw"
                        style={{ objectFit: 'cover' }}
                        quality={60}
                    />
                </SwiperSlide>
                <SwiperSlide className={styles.heroSlide}>
                    <Image 
                        src="/images/hero/hero4.jpg" 
                        alt="Beautiful destination 3" 
                        fill
                        sizes="100vw"
                        style={{ objectFit: 'cover' }}
                        quality={60}
                    />
                </SwiperSlide> */}
            </Swiper>
        </div>
    )
}
