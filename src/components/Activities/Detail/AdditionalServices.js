'use client'
import React from 'react'
import PriceDisplay from '@/components/Currency/PriceDisplay'
import styles from './Selection.module.css'

export default function AdditionalServices({ Services, currency, selectedServices, setSelectedServices, setServicesTotal }) {

    const handleServiceToggle = (service) => {
        const isSelected = selectedServices.find((s) => s.name === service.name);
        if (isSelected) {
            const updatedServices = selectedServices.filter((s) => s.name !== service.name);
            const Total = updatedServices.reduce((acc, curr) => acc + Number(curr.total), 0)
            setServicesTotal(Total);
            setSelectedServices(updatedServices);
        } else {
            const newService = {
                "name": service.name,
                "type": service.type,
                "price": service.price,
                "quantity": 1,
                "total": Number(service.price)
            };
            const updatedServices = [...selectedServices, newService];
            const Total = updatedServices.reduce((acc, curr) => acc + Number(curr.total), 0)
            setServicesTotal(Total);
            setSelectedServices(updatedServices);
        }

    };
    const handleQuantityChange = (serviceName, changeType) => {
        const updatedServices = selectedServices.map((service) => {
            if (service.name === serviceName) {
                if (changeType === 'plus') {
                    const newQty = service.quantity + 1;
                    return { ...service, quantity: newQty, total: newQty * Number(service.price) };
                } else if (changeType === 'minus' && service.quantity > 1) {
                    const newQty = service.quantity - 1;
                    return { ...service, quantity: newQty, total: newQty * Number(service.price) };
                }
            }
            return service;
        });
        const Total = updatedServices.reduce((acc, curr) => acc + Number(curr.total), 0)
        setServicesTotal(Total);
        setSelectedServices(updatedServices);
    }

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <h5 className={styles.panelTitle}>Additional Services</h5>
                <p className={styles.panelSub}>Enhance your journey with optional services</p>
            </div>
            <div className={styles.panelBody}>
                {Services.map((service, index) => (
                    <div key={index} className={styles.serviceCard}>
                        <div className={styles.serviceRow}>
                            <div className={styles.serviceSwitch}>
                                <input
                                    onChange={() => handleServiceToggle(service)}
                                    checked={selectedServices.some(s => s.name === service.name)}
                                    type="checkbox"
                                    role="switch"
                                    id={`switchCheckDefault-${index + 1}`}
                                />
                                <label htmlFor={`switchCheckDefault-${index + 1}`}>{service?.name}</label>
                            </div>
                            <div className={styles.servicePriceWrap}>
                                <div className={styles.servicePrice}>
                                    <PriceDisplay price={service.price} currency={currency} />
                                </div>
                                <div className={styles.serviceMeta}>
                                    {service.type === 'per_person' ? 'per person' : 'per booking'}
                                </div>
                            </div>
                        </div>
                        {selectedServices.some(s => s.name === service.name) && service.type === 'per_person' && (
                            <div className={styles.qtyBox} style={{ marginTop: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => handleQuantityChange(service.name, 'minus')}
                                    className={styles.qtyBtn}
                                    aria-label={`Decrease ${service.name}`}
                                >−</button>
                                <span className={styles.qtyValue}>
                                    {selectedServices.find(s => s.name === service.name)?.quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleQuantityChange(service.name, 'plus')}
                                    className={styles.qtyBtn}
                                    aria-label={`Increase ${service.name}`}
                                >+</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
