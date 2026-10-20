'use client'
import React from 'react'
import { Timeline, Text } from '@mantine/core';

export default function PackageDetailIteniry({ itinrList }) {
    return (
        <div className="package-section my-4">
            <h5 className='mb-4'>Itineraries</h5>
            <Timeline active={2} color='#003535' bulletSize={24} lineWidth={2}>
                {itinrList.map((itenr, index) => (
                    <Timeline.Item key={index} title={itenr.title +'-'+itenr?.description} bullet={<span>{index+1}</span>}>
                        <Text c="dimmed" size="sm">
                            {itenr?.content}
                        </Text>
                    </Timeline.Item>
                ))}
            </Timeline>
        </div>
    )
}
